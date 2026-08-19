# Hal

> An autonomous, self-hostable meeting agent that joins Google Meet, Zoom, and Microsoft Teams on your behalf — listens, takes notes, speaks when you want it to, and follows up after.

Hal is an open-source alternative to Read AI, built around four ideas:

1. **Autonomous attendance** — Hal joins meetings *for* you, not just alongside you.
2. **Bot-as-delegate, never deepfake** — Hal is always disclosed as an AI; it can use your voice, but never impersonates you.
3. **Calendar-aware** — connect your calendar once and Hal knows what to join, and when.
4. **Self-hostable from day one** — your tokens, your transcripts, your audio. Envelope-encrypted, pluggable KMS.

## Status

Pre-alpha. Landing page is live. The Meet agent runtime is **written** (Playwright + PulseAudio + STT → summary → envelope encrypt → email) and not yet dogfooded on a live call. Calendar cockpit, Zoom, and Teams are not shipped. Oracle Always Free is retired; the dogfood host is AWS EC2.

## Workspace

This is a [Bun](https://bun.sh) workspace.

```
hal-meetings/
├── apps/
│   ├── web/                  # Next.js 15 — landing (dashboard next)
│   └── agent/                # Meet join runtime, job worker, Dockerfile
├── packages/
│   ├── design-tokens/        # Adora design system tokens (CSS + TS)
│   ├── ui/                   # Shared React components
│   ├── db/                   # Drizzle schema + repositories (Neon)
│   ├── crypto/               # Envelope encryption, pluggable KMS
│   └── media/                # STT / LLM / TTS providers + summarizer
├── infra/                    # leftover Oracle terraform; AWS next
└── docs/                     # Architecture + self-host guides
```

Planned, not scaffolded:

- `apps/desktop` — Tauri app for native meeting capture and the menu-bar control
- `apps/mobile` — Expo app to join physical, in-person meetings via the device mic

## Develop

```bash
bun install
bun run dev
```

Agent one-shot (see [`docs/dogfood-meet.md`](./docs/dogfood-meet.md)):

```bash
bun run --filter @hal/agent seed-user -- --email you@example.com --name You
bun run --cwd apps/agent src/cli.ts join --url 'https://meet.google.com/…' --user '<uuid>'
```

## Docs

| Doc | For |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Product architecture |
| [`docs/m1-bot-runtime.md`](./docs/m1-bot-runtime.md) | Meet / Zoom / Teams runtime design |
| [`docs/dogfood-meet.md`](./docs/dogfood-meet.md) | Prove a live Meet join |
| [`docs/self-host-google-oauth.md`](./docs/self-host-google-oauth.md) | Create your Google OAuth client (Wave 1 scopes) |
| [`docs/mcp-claude.md`](./docs/mcp-claude.md) | How Hal MCP will connect to Claude and OpenCode |
| [`docs/deploy-oracle.md`](./docs/deploy-oracle.md) | Leftover — Oracle path is retired |

## Deploy

| Surface | Host | Doc |
|---|---|---|
| Landing (`apps/web`) | Vercel | auto-deploys from `main` |
| Database | [Neon](https://neon.tech) | `packages/db/README.md` |
| Bot agent (`apps/agent`) | AWS EC2 (planned), Docker on Linux | [`docs/dogfood-meet.md`](./docs/dogfood-meet.md) |

The agent's Dockerfile is multi-arch (x86_64 and arm64).

## License

To be decided — leaning AGPL-3.0 for the core, MIT for `packages/*`.
