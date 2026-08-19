# Hal — Architecture

> An autonomous, self-hostable meeting agent. Joins Meet, Zoom, and Teams on your behalf. Multi-tenant from commit one. Encrypted by default.

## The four (five) fundamental questions

Every meeting agent answers these. Hal answers them out loud.

| # | Question | Hal's answer |
|---|---|---|
| 1 | **How does it enter the meeting?** | Native SDKs where they exist (Zoom Meeting SDK, MS Teams Bot Framework). Hardened headless Chromium worker for Google Meet. Hybrid by design. |
| 2 | **What identity does it use inside?** | **Bot-as-delegate.** Always disclosed as AI, always with the user's name attached ("Hal · AI for Hal Okorie"). Voice cloning is opt-in, consent-gated, watermarked. **Never full impersonation.** |
| 3 | **How does it know what meetings to join?** | Calendar integration (Google Calendar push, MS Graph subscriptions). Per-meeting user policy: auto-join, ask-first, ignore. |
| 4 | **What does it do after?** | Transcripts, action items, drafted follow-ups (for review), CRM/Notion/Linear/Slack handoffs. |
| 5 | **How does it behave when something goes wrong?** | Silent fail beats confident lie. Guardrails before speaking. Kill switch (user dials in → bot mutes). Audit log of every action taken. |

## Deployment shapes — one codebase, three modes

| Mode | Who runs it | Tenants | Auth | KMS |
|---|---|---|---|---|
| **Self-host, single-user** | An individual | 1 | Own OAuth apps | libsodium / Vault local |
| **Self-host, multi-user** | A team | N | Org OAuth apps | Vault Transit / cloud KMS |
| **Hosted SaaS** (future) | Hal team | N | Managed OAuth | AWS / GCP KMS |

The code never knows which mode. Config picks providers; the rest is identical.

## Single-user-first, multi-tenant-shaped

Build for yourself first. But write the code as if there were 10,000 users on day one.

- `users` table exists from commit 1, even with one row.
- Real OAuth from the start — no `process.env.HAL_GOOGLE_TOKEN`.
- Every record foreign-keys to `user_id`.
- Bot workers receive `user_id` as input; never read user state from globals.
- Per-user encrypted token storage even if the keyring has one entry.

Cost: ~10% extra effort up front. Payoff: opening to others is a config + signup flow, not a rewrite.

## Encryption — envelope, per-user DEK, pluggable KMS

```
          ┌────────────────────────────────────┐
          │   KMS (Vault / AWS KMS / GCP KMS)  │
          │   Master Key (KEK)                 │  ← never leaves KMS
          └──────────────┬─────────────────────┘
                         │ wraps / unwraps
                         ▼
          ┌────────────────────────────────────┐
          │  Per-user DEK (AES-256-GCM)        │  ← generated once per user,
          │  Stored encrypted in DB            │     stored as ciphertext only
          └──────────────┬─────────────────────┘
                         │ encrypts
                         ▼
          ┌────────────────────────────────────┐
          │  User's tokens, transcripts,       │
          │  audio, persona, action history    │
          └────────────────────────────────────┘
```

Rules:
- **No plaintext at rest.** Every secret-bearing column is `BYTEA` ciphertext.
- **No plaintext in logs.** Logger has explicit redactors for token-shaped strings.
- **Never returned via API.** The dashboard never displays a raw refresh token.
- **Decrypted only in the bot worker process**, just-in-time, never cached cross-request.
- **Per-user DEKs** so one compromise doesn't fan out.

## System overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User's Browser │────▶│   Control Plane  │────▶│  Bot Orchestr.  │
│  (dashboard)    │     │  (API + Auth)    │     │  (spawns bots)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                │                          │
                        ┌───────▼────────┐         ┌───────▼────────┐
                        │ Calendar Watch │         │  Bot Workers   │
                        │ (Google/MS)    │         │  (per meeting) │
                        └────────────────┘         └───────┬────────┘
                                                            │
                              ┌─────────────────────────────┼─────────────────────────┐
                              │                             │                          │
                       ┌──────▼──────┐              ┌───────▼────────┐         ┌──────▼──────┐
                       │ Zoom SDK    │              │ Teams Bot SDK  │         │ Headless    │
                       │ Worker      │              │ Worker         │         │ Chromium    │
                       │             │              │                │         │ (Meet)      │
                       └──────┬──────┘              └───────┬────────┘         └──────┬──────┘
                              │                             │                          │
                              └─────────────────────────────┼──────────────────────────┘
                                                            │
                                              ┌─────────────▼──────────────┐
                                              │     Media Pipeline         │
                                              │  audio in → STT → LLM      │
                                              │  LLM → TTS → audio out     │
                                              │  chat in / chat out        │
                                              └─────────────┬──────────────┘
                                                            │
                                              ┌─────────────▼──────────────┐
                                              │   Memory + Action Layer    │
                                              │  - meeting context (RAG)   │
                                              │  - user persona / prefs    │
                                              │  - post-meeting actions    │
                                              └────────────────────────────┘
```

## Pluggable providers (config-driven)

Everything below is swappable via env var. Self-hosters can go fully local; SaaS swaps in managed.

```
KMS_PROVIDER     = local | vault | aws-kms | gcp-kms
STORAGE_PROVIDER = local-fs | s3 | gcs
STT_PROVIDER     = whisper-local | deepgram | assemblyai
TTS_PROVIDER     = piper-local | elevenlabs
LLM_PROVIDER     = ollama-local | anthropic | openai
DB_URL           = postgres://...
SIGNUP_MODE      = closed | invite | open
```

The "fully air-gapped" tier (Whisper + Piper + Ollama + libsodium + local FS) is a first-class supported configuration.

## Phase 0 — what ships first

> **Goal:** prove the bot-joining mechanic before investing in three platforms.

- Google Meet only (headless browser worker)
- Listen-only mode (no speaking)
- Manually-triggered (paste a Meet URL into the dashboard)
- Transcript + summary emailed to the user
- No calendar integration yet
- No Zoom, no Teams
- Bot identifies as "Hal · AI for &lt;user&gt;"

Once that works end-to-end:
- Phase 1: Google Calendar push → auto-join
- Phase 2: Chat-on-behalf (controlled, low-risk action surface)
- Phase 3: Speak-on-behalf behind feature flag + persona/guardrails
- Phase 4: Zoom SDK worker
- Phase 5: Teams SDK worker
- Phase 6: Post-meeting actions layer (CRM, email drafts, calendar holds)

## Workspace layout

```
hal-meetings/
├── apps/
│   ├── web/                  # Next.js 15 — landing; cockpit not shipped
│   └── agent/                # Meet Playwright runtime + job worker (Zoom/Teams stubs)
├── packages/
│   ├── design-tokens/        # Adora system tokens (CSS + TS)
│   ├── ui/                   # Shared React primitives
│   ├── db/                   # Drizzle + repos (users, oauth_tokens, meetings, jobs, …)
│   ├── crypto/               # Envelope encryption, pluggable KMS
│   └── media/                # STT / LLM / TTS + summarizer (not a separate providers pkg)
├── infra/                    # leftover Oracle; AWS EC2 is the dogfood host
└── docs/
    └── architecture.md       # ← you are here
```

Planned, not scaffolded:

- `apps/desktop` — Tauri app for native menu-bar control and on-device meeting capture
- `apps/mobile` — Expo app for joining physical, in-person meetings via device mic

## Open questions, deliberately deferred

- License: AGPL-3.0 core + MIT for `packages/*`, vs. fully AGPL? *Leaning split.*
- Billing layer for hosted SaaS: Stripe vs. LemonSqueezy? *Defer past phase 5.*
- Voice cloning consent flow UX. *Defer past phase 3.*
- Region-aware recording-consent policy engine. *Defer past phase 4.*
