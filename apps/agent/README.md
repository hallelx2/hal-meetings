# @hal/agent

The Hal bot runtime. Joins meetings, captures audio, transcribes, summarizes, emails.

## What's inside

```
src/
├── cli.ts                          # `hal-agent join` and `hal-agent worker`
├── config.ts                       # env-driven config
├── logger.ts                       # pino + redaction from @hal/crypto
├── runtime/
│   ├── types.ts                    # BotRuntime / JoinSession interface
│   ├── meet.ts                     # ✅ Playwright headless Chromium (production)
│   ├── zoom.ts                     # 🚧 SDK subprocess wrapper (interface ready, gated on Track A1)
│   ├── teams.ts                    # 🚧 Bot Framework (interface ready, gated on Track A3)
│   └── factory.ts
├── audio/
│   ├── types.ts
│   ├── pulse.ts                    # parec subprocess — production audio capture
│   └── file-sink.ts                # debug WAV tee
├── email/
│   └── resend.ts                   # Resend transactional email
├── pipeline/
│   └── meeting-session.ts          # end-to-end orchestration
└── jobs/
    ├── consumer.ts                 # Postgres SKIP-LOCKED job poller
    └── handlers.ts                 # join_meeting handler

docker/
├── pulse.pa                        # system PulseAudio config (creates halsink)
└── entrypoint.sh                   # start Xvfb + PulseAudio before bun
Dockerfile                          # bun + Chromium + PulseAudio + Xvfb
```

## Running locally

### One-shot Meet session

```bash
bun run src/cli.ts join \
  --url 'https://meet.google.com/abc-defg-hij' \
  --user '<user-uuid-from-db>' \
  --platform meet \
  --mode listen \
  --title 'Launch review'
```

You'll need these env vars set (or in `.env`):

```
DATABASE_URL=postgres://hal:hal@localhost:5432/hal
HAL_LOCAL_KMS_KEY=<64-hex-char master key>
KMS_PROVIDER=local
STT_PROVIDER=whisper-local         # or 'deepgram'
WHISPER_BINARY=/usr/local/bin/whisper
WHISPER_MODEL=/var/lib/whisper/ggml-base.en.bin
LLM_PROVIDER=ollama                # or 'anthropic'
OLLAMA_MODEL=llama3.2
RESEND_API_KEY=re_***              # optional — Hal uses NullEmailSender if missing
HAL_PULSE_SINK=halsink             # default
```

Generate a local KMS master key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Long-lived worker

```bash
bun run src/cli.ts worker --concurrency 1
```

Polls `jobs` table for `join_meeting` work.

## Docker

```bash
docker build -f apps/agent/Dockerfile -t hal-agent .
docker run --rm \
  -e DATABASE_URL=... \
  -e HAL_LOCAL_KMS_KEY=... \
  -e KMS_PROVIDER=local \
  -e STT_PROVIDER=whisper-local \
  -e WHISPER_BINARY=... -e WHISPER_MODEL=... \
  -e LLM_PROVIDER=ollama -e OLLAMA_MODEL=llama3.2 \
  -e OLLAMA_ENDPOINT=http://host.docker.internal:11434 \
  hal-agent
```

The container starts `Xvfb` and PulseAudio (with the `halsink` null sink) before launching `bun`. Chromium plays into `halsink`; `parec` captures from `halsink.monitor`. All audio stays inside the container until handed to STT.

## What runs today vs. what's gated

| Path | Status | Gate |
|---|---|---|
| Meet (Playwright) | ✅ Code complete, needs real-env testing (Meet URL + an account) | None |
| Zoom (Meeting SDK) | 🚧 Interface complete, throws `NotYetIntegrated` | Track A1: register Zoom Marketplace app, download Linux SDK |
| Teams (Bot Framework) | 🚧 Interface complete, throws `NotYetIntegrated` | Track A3: Microsoft Calling/Meeting permission request (4–12 weeks) |

When tracks A1/A3 land, the only file changes are inside `runtime/zoom.ts` and `runtime/teams.ts` — the rest of the pipeline is platform-agnostic.

## Selectors will rot

Meet's DOM is not a public API. The selectors in `runtime/meet.ts` are accessible-name based, which is more durable than CSS classes, but they will need maintenance. If joining suddenly breaks, that file is the first place to look.
