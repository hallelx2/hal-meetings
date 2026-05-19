# M1 — Bot Runtime: Strategy + Design

> **Decision (2026-05-19):** Build all three bot paths in parallel. Headless Chromium for Google Meet is the dogfood path (ships first, no approval gate). Zoom Meeting SDK and Microsoft Teams Bot Framework run on parallel tracks with external review clocks started immediately.

This doc covers the architecture for **M1**, the first end-to-end working Hal: a bot runtime that joins meetings on three platforms, captures audio, hands it to a transcription pipeline, and emails the user a summary. No dashboard, no calendar integration, no speaking — just a working bot.

---

## 1. Strategy: why parallel, why headless-Meet-first

The constraint nobody warns you about is **external review timelines**:

| Path | Dev mode (you + allowlisted) | Published mode (anyone) |
|---|---|---|
| Google Meet (headless Chromium) | Instant | Instant (no review exists) |
| Zoom Meeting SDK | Instant (own paid account + manual allowlist up to ~100) | Zoom Marketplace review — 2–12 weeks |
| Microsoft Teams Bot Framework | **Partially blocked** — generic bots are instant, but the *Calling and Meeting Bot* permission Hal needs is not self-serve | Same gated request — 4–12 weeks |

Conclusion: **the external clocks are the longest poles.** Code can be ready in 2–4 weeks per platform; approvals are 4–12 weeks each. So start the clocks *now*, while writing the code.

Headless Meet is the only path with no clock at all — so it becomes the demo-able product while the others wait.

This sequencing is also defensive: by the time Zoom/MS approvals come back, Hal has live users on the Meet path and a real waitlist. That's a much stronger case in the application packets.

---

## 2. Four parallel workstreams

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Track A — External clocks (start TODAY, mostly paperwork)                │
│ ├─ Zoom Marketplace developer app registration                            │
│ ├─ Microsoft Azure tenant + Bot Framework registration                    │
│ └─ Microsoft Calling and Meeting Bot permission request                   │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ Track B — Headless Chromium for Meet (no gates, ships first)              │
│ Goal: dogfood-ready demo by week 2                                        │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ Track C — Zoom Meeting SDK worker (parallel; ships when review passes)    │
│ Goal: dev-mode demo by week 3, public when Marketplace review lands       │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ Track D — Microsoft Teams Bot Framework worker (parallel; longest gate)   │
│ Goal: dev-mode demo when calling permission lands, public same time       │
└──────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
         Shared infrastructure — audio interface, transcription,
                  orchestrator, transcript store, summary email
```

---

## 3. Track A — External clocks (file in week 1)

### A1. Zoom Marketplace developer account

- Sign up at https://marketplace.zoom.us (free with paid Zoom account)
- Create an app of type **"Server-to-Server OAuth"** or **"Meeting SDK app"**
  - Meeting SDK app is what Hal needs (gives access to the SDK that lets a process join a meeting)
- Configure:
  - App display name: `Hal — Meeting Agent`
  - Description: short pre-alpha description
  - Privacy URL: `https://hal-meetings.vercel.app/privacy`
  - ToS URL: `https://hal-meetings.vercel.app/terms`
  - Scopes: `meeting:read`, `meeting:write`, `recording:read` (review what's actually needed)
- Receive SDK key + secret → store as `ZOOM_SDK_KEY` / `ZOOM_SDK_SECRET` in `.env` (encrypted)
- App stays in **Development** mode until Marketplace review

### A2. Microsoft Azure tenant + Bot Framework registration

- Sign up at https://azure.microsoft.com (free tier OK for dev)
- Register an Azure AD application → get tenant ID, client ID, client secret
- Register a Bot Framework bot (the "Azure Bot" resource) → get Microsoft App ID + password
- Configure:
  - Messaging endpoint: `https://hal-meetings.vercel.app/api/bot/teams` (placeholder; will route to worker)
  - Calling endpoint: same
- Store credentials encrypted in `.env`

### A3. Microsoft Calling and Meeting Bot permission request

- The Calling/Meeting permission is **not self-serve**. You file a request through Microsoft's customer service portal:
  - Use the [Microsoft Teams Apps app submission API](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/proof-of-presence-in-meeting/register-calling-bot) flow
  - You'll need: a working bot in your dev tenant, scenario description, security review form
- Submission contents:
  - Bot framework app ID
  - Use case: "AI meeting assistant that joins on behalf of a user, transcribes, and posts summaries"
  - How user consent works (we have envelope-encrypted OAuth + per-user policy + audible disclosure on join)
- Timeline: **4–12 weeks**. File week 1. Forget about it until they reply.

### A4. (Parallel) Domain + email infrastructure

- Real domain (hal-meetings.com or similar) so the Privacy/ToS URLs aren't on `vercel.app`
- Transactional email sender (Resend / Postmark) for "Hal sent you a summary" emails

---

## 4. Track B — Headless Chromium for Meet (the dogfood path)

**Location in repo:** `apps/agent/` (new package)

### B1. Package shape

```
apps/agent/
├── package.json                 # bun workspace pkg @hal/agent
├── Dockerfile                   # Chromium + Xvfb + PulseAudio + bun runtime
├── src/
│   ├── cli.ts                   # `hal-agent join <url> --user <id> --mode listen`
│   ├── runtime/
│   │   ├── meet-worker.ts       # Playwright-based join loop
│   │   ├── audio-capture.ts     # PulseAudio sink → PCM stream
│   │   ├── disclosure.ts        # "Hi, I'm Hal · AI ..." join announcement
│   │   ├── kicked-detector.ts   # detect lobby denial / removal
│   │   └── chat-listener.ts     # observe Meet chat (for cmds like "/hal stop")
│   ├── transports/
│   │   ├── file.ts              # dump to .wav for debugging
│   │   └── live-stt.ts          # stream PCM → STT provider (track E)
│   └── jobs/
│       └── job.ts               # job descriptor: {userId, meetingUrl, mode}
└── test/
    └── fixtures/                # recorded HAR / page fixtures for tests
```

### B2. Library choice — Playwright vs Puppeteer

**Playwright.** Reasons:
- First-class Chromium control with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream`
- Better headless audio routing on Linux
- Easier multi-context isolation (each user's bot worker = separate browser context)
- Stronger test ergonomics

### B3. Join flow

```
1. spawn isolated browser context with virtual mic + virtual cam
2. navigate to meeting URL
3. wait for guest-name input field (or signed-in already if using authed cookie session)
4. type "Hal · AI for <user-name>"
5. click "Ask to join"
6. wait for either:
   - admitted to meeting (success)
   - lobby denied (failure → notify user)
   - timeout (failure → retry once → notify user)
7. ON admission:
   a. Send chat message: "Hi, I'm Hal, an AI assistant attending on <user-name>'s behalf. I'm transcribing. Reply '/hal stop' to remove me."
   b. Begin audio capture from page's audio output (PulseAudio loopback)
   c. Stream PCM to STT (track E)
   d. Watch chat for "/hal stop" or removal
8. ON meeting end (other participants leave, host removes, /hal stop):
   a. Stop audio capture
   b. Finalize transcript
   c. Trigger summary job (track F)
```

### B4. Audio capture — the tricky part

**Problem:** in a containerized headless Chromium, the page produces audio output through the browser's audio stack. We need to capture it as PCM samples.

**Solution:** PulseAudio with a virtual sink.

```bash
# in Dockerfile
RUN apt-get install -y pulseaudio
RUN pactl load-module module-null-sink sink_name=halsink
# Chromium uses halsink as its output device (set via launch args)
# We `parec` from halsink.monitor to get the raw PCM
parec --device=halsink.monitor --rate=16000 --channels=1 --format=s16le
```

This produces a 16kHz mono 16-bit PCM stream we can pipe directly into STT.

### B5. Anti-detection posture

Meet does not have aggressive bot detection (compared to ticketing sites etc.), but we should still:
- Use `playwright-extra` with `stealth` plugin
- Random ~human delays between actions (200–600ms)
- A realistic user agent
- Disable navigator.webdriver

**We are not trying to deceive.** The bot self-discloses on join via chat. Anti-detection is purely about not getting auto-kicked by overly aggressive heuristics — not impersonation.

### B6. Acceptance test for B

```
GIVEN a Meet URL of a meeting the operator has created
WHEN  `hal-agent join <url> --user halleluyah --mode listen`
THEN  the bot appears in the meeting as "Hal · AI for Halleluyah Oludele"
AND   it posts a disclosure message in chat
AND   it captures audio to a .wav file for the meeting's duration
AND   on meeting end it produces a transcript and triggers the summary job
AND   the operator can run `/hal stop` in chat to dismiss the bot
```

---

## 5. Track C — Zoom Meeting SDK worker

**Location in repo:** `apps/agent/src/runtime/zoom-worker.ts` (same package as B; different runtime)

### C1. SDK choice

Zoom has multiple SDKs:
- **Meeting SDK for Linux** (C++ headless) — production option, exactly what bots use
- **Meeting SDK for Web** (in-browser) — works, but needs the same headless Chromium stack as track B; defeats the purpose
- **Video SDK** — for custom video apps, not for joining Zoom meetings

**Use Meeting SDK for Linux.** Wrap it in a thin Bun/Node FFI or a separate small C++ process the worker controls.

### C2. Architecture

```
[bun worker] ──spawns──▶ [zoom-meeting-sdk-linux subprocess] ──joins──▶ Zoom call
                                       │
                                  PCM audio frames
                                       ▼
                                  [bun worker]
                                       │
                                       ▼
                                  STT (track E)
```

The Linux SDK gives you raw PCM out of the box — no PulseAudio shenanigans.

### C3. Auth model

Zoom Meeting SDK uses **JWT signing** with the SDK key/secret from track A1. Each meeting join requires a freshly signed token with `mn` (meeting number) and `role` (0=attendee) claims.

### C4. Dev mode quirks

- In dev mode, the SDK only joins meetings hosted by accounts in the Marketplace app's allowlist
- For Hal, that's "Halleluyah's own paid Zoom account" — plenty for dogfooding
- When a waitlist user wants to use Hal on Zoom: either (1) wait for Marketplace approval, or (2) manually allowlist them as a dev user

### C5. Acceptance test for C

```
GIVEN a Zoom meeting hosted by Halleluyah's own Zoom account
WHEN  `hal-agent join <zoom-url> --user halleluyah --mode listen --platform zoom`
THEN  the bot joins the meeting (visible as "Hal · AI for Halleluyah Oludele")
AND   PCM audio is captured for the meeting's duration
AND   transcript + summary are produced identically to track B
```

---

## 6. Track D — Microsoft Teams Bot Framework worker

**Location in repo:** `apps/agent/src/runtime/teams-worker.ts`

### D1. SDK choice

Microsoft's [Bot Framework SDK for Node.js](https://github.com/microsoft/botbuilder-js) with the [Communications calling SDK](https://learn.microsoft.com/en-us/graph/cloud-communications-concept-overview).

### D2. Architecture

```
Teams → Bot Framework callback URL → [bun handler] → Calling SDK answers/joins
                                                              │
                                                         PCM audio frames
                                                              ▼
                                                         STT (track E)
```

Unlike Zoom (where the bot is a process that joins a URL), Teams routes a "incoming call" event to the bot's HTTPS callback. The bot accepts and joins via the Communications API.

### D3. The calling permission gate

The bot can be **built and tested** in your own Azure tenant immediately, but it cannot:
- Join meetings in other tenants without the Calling/Meeting permission flag
- Capture audio without the `Calls.AccessMedia.All` permission

Both gated by the request filed in A3. **Code can be written in parallel; deployment to anyone outside Halleluyah's own tenant waits on Microsoft.**

### D4. Acceptance test for D (post-approval)

```
GIVEN Halleluyah's Azure tenant has the calling/meeting permission flag enabled
WHEN  a Teams meeting invites the Hal bot
THEN  the bot joins as "Hal · AI for <user>"
AND   PCM audio is captured for the meeting's duration
AND   transcript + summary are produced identically to tracks B and C
```

---

## 7. Track E — Shared media pipeline (used by B, C, D)

**Location:** `packages/media/` (new shared package)

### E1. Interfaces

```typescript
// packages/media/src/stt.ts
interface SttProvider {
  startStream(opts: { sampleRate: number; lang: string }): SttSession;
}
interface SttSession {
  write(pcm: Buffer): void;
  end(): Promise<TranscriptResult>;
  on(event: 'partial' | 'final', cb: (line: TranscriptLine) => void): void;
}

// packages/media/src/llm.ts
interface LlmProvider {
  summarize(transcript: Transcript, opts: SummaryOpts): Promise<MeetingSummary>;
}
```

### E2. Provider adapters (pluggable per the architecture doc)

- `whisper-local` — `whisper.cpp` subprocess, no external call
- `deepgram` — WSS stream, recommended for prod (best latency + diarization)
- `assemblyai` — alternative
- `ollama-local` — for LLM summary, fully local
- `anthropic` — Claude for higher-quality summaries
- `openai` — alternative

### E3. Diarization

Required: every transcript line tagged with `speaker_id`. Deepgram provides this natively. With Whisper, use `pyannote.audio` or a similar diarization model post-hoc.

---

## 8. Track F — Shared orchestrator + summary email

**Location:** `apps/agent/src/orchestrator.ts` + tiny scaffolding in `apps/web/src/server`

### F1. Job queue

Pre-M5: just a Postgres-backed `jobs` table polled by the agent worker. After M6: Temporal for durable workflows.

### F2. Summary email

After meeting ends:
1. Worker writes transcript ciphertext + summary to `transcripts` table (track G)
2. Worker queues a `send_summary_email` job
3. Email job pulls user's email, decrypts summary preview, sends via Resend
4. Email contains a link to a `/m/<id>` page on the dashboard (built in M4) where the full transcript lives — server decrypts on render

For M1 (no dashboard yet), email contains the full markdown summary inline. Transcripts still encrypted in DB; we just send a snapshot via secure email.

---

## 9. Track G — Foundation packages (do these in week 1)

These are unblocked by everything else and feed the bot workers.

```
packages/db/         ← Drizzle schema + migrations
  src/schema/
    users.ts
    oauth_tokens.ts
    meetings.ts
    transcripts.ts
    jobs.ts
    audit_log.ts

packages/crypto/     ← envelope encryption with pluggable KMS
  src/
    kms/
      local.ts       (libsodium, dev only)
      vault.ts       (HashiCorp Vault Transit)
      aws-kms.ts
      gcp-kms.ts
    envelope.ts      (high-level encrypt/decrypt with per-user DEK)

packages/auth/       ← Better Auth wrapper
  src/
    options.ts
    google.ts
    microsoft.ts
    zoom.ts
```

Schema sketch:

```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  dek_wrapped BYTEA NOT NULL,
  dek_kms_key_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,     -- 'google' | 'microsoft' | 'zoom'
  access_token_ct BYTEA NOT NULL,
  refresh_token_ct BYTEA,
  expires_at TIMESTAMPTZ,
  scopes TEXT[]
);

meetings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,     -- 'meet' | 'zoom' | 'teams'
  external_url TEXT,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  policy TEXT NOT NULL,       -- 'auto' | 'ask' | 'ignore'
  mode TEXT NOT NULL          -- 'listen' | 'chat' | 'speak' | 'skipped'
);

transcripts (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_ct BYTEA NOT NULL,  -- markdown ciphertext
  summary_ct BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  kind TEXT NOT NULL,
  payload_ct BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  picked_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  meeting_id UUID,
  action TEXT NOT NULL,       -- 'bot_joined' | 'bot_spoke' | 'transcript_decrypted' | ...
  actor TEXT NOT NULL,        -- 'system' | 'bot' | 'user:<id>'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. M1 acceptance criteria

M1 is "done" when **all** of these are true:

| ID | Criterion |
|---|---|
| AC1 | `hal-agent join <meet-url>` joins a Google Meet and produces a transcript file |
| AC2 | `hal-agent join <zoom-url>` joins a Zoom meeting (Halleluyah's account) and produces a transcript file |
| AC3 | Bot self-discloses via chat on join, every time |
| AC4 | Audio capture works inside Docker container with no host-OS bleed |
| AC5 | STT produces speaker-diarized transcripts with reasonable accuracy (<15% WER) |
| AC6 | LLM summary is a structured markdown doc: decisions, action items, open questions, attendees |
| AC7 | Summary email lands in inbox within 3 minutes of meeting end |
| AC8 | All tokens stored in DB are envelope-encrypted; no plaintext anywhere |
| AC9 | Audit log entry exists for every meaningful action |
| AC10 | Zoom Marketplace dev app exists; MS calling permission request filed |
| AC11 | Teams worker compiles and joins in Halleluyah's dev tenant (waiting on approval is fine) |

When all 11 are true, M1 is shipped. Next milestone is M3 (DB + auth) — already partially done as a dependency here — plus M4 (dashboard).

---

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Meet lobby blocks the bot when no host is present | Use a dedicated meet.google.com account for "host accepts the bot"; long-term, host integrates via Calendar invite |
| PulseAudio inside Docker on Mac/Windows host is fiddly | Develop and document on Linux first; Mac/Windows dev uses devcontainer or remote Linux instance |
| Zoom Marketplace rejects "AI meeting bot" use case | Frame as "transcription + summarization assistant joining on user's behalf"; cite Otter/Read AI/Fireflies precedent |
| Microsoft never approves calling permission | Teams remains unsupported; ship Meet + Zoom; revisit when there's traction |
| Anti-bot heuristics evolve | Stealth posture is best-effort; if Meet blocks us, fall back to Calendar-API hybrid (less ideal but possible) |
| Audio quality from headless Chromium is poor | Switch to a Linux SDK if Google ever publishes one; until then, Whisper handles 16kHz mono well |
| Recording-consent legal exposure | Region-aware policy in bot worker; bot waits for explicit consent in all-party-consent jurisdictions before recording |

---

## 12. What's NOT in M1

- ❌ Dashboard (M4)
- ❌ Calendar auto-join (M5)
- ❌ Speak-on-behalf mode (M9)
- ❌ Post-meeting actions beyond email summary (M10)
- ❌ Hosted SaaS infrastructure (post-v1)
- ❌ Voice cloning (post-v1, possibly never depending on legal posture)
- ❌ Mobile apps (post-v1)
- ❌ Desktop menu-bar app (post-v1)

---

## 13. Suggested week-1 to-do

1. **Day 1 (Mon)** — File Microsoft Calling permission request (longest clock). Register Zoom Marketplace app. Buy domain + set up email sender.
2. **Day 1–2** — Scaffold `apps/agent` package + Dockerfile (Xvfb + PulseAudio + Chromium). Get a "hello world" Playwright script joining a Meet.
3. **Day 2–3** — Scaffold `packages/db` with Drizzle schema. Run migrations against local Postgres.
4. **Day 3–4** — Scaffold `packages/crypto` with libsodium local KMS + envelope encryption. Tests.
5. **Day 4–5** — Wire `hal-agent` CLI to take a Meet URL and join (no audio yet).
6. **Day 5–7** — Audio capture working: PulseAudio sink, parec piping, .wav files written to disk for manually verified clips.

Week 2 onwards: STT integration, Zoom SDK worker, summary email pipeline.

The Meet path is the dogfood path. When it's stable, **start using Hal yourself for your real meetings**. That's the fastest way to find the gnarly edge cases.
