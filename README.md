# Hal

> An autonomous, self-hostable meeting agent that joins Google Meet, Zoom, and Microsoft Teams on your behalf — listens, takes notes, speaks when you want it to, and follows up after.

Hal is an open-source alternative to Read AI, built around four ideas:

1. **Autonomous attendance** — Hal joins meetings *for* you, not just alongside you.
2. **Bot-as-delegate, never deepfake** — Hal is always disclosed as an AI; it can use your voice, but never impersonates you.
3. **Calendar-aware** — connect your calendar once and Hal knows what to join, and when.
4. **Self-hostable from day one** — your tokens, your transcripts, your audio. Envelope-encrypted, pluggable KMS.

## Status

Pre-alpha. The landing page is up; the agent runtime is in design.

## Workspace

This is a [Bun](https://bun.sh) workspace.

```
hal-meetings/
├── apps/
│   └── web/                  # Next.js 15 landing + dashboard
├── packages/
│   ├── design-tokens/        # Adora design system tokens (CSS + TS)
│   └── ui/                   # Shared React components
└── docs/                     # Architecture notes
```

Planned (not yet scaffolded):

- `apps/desktop` — Tauri app for native meeting capture and the menu-bar control
- `apps/mobile` — Expo app to join physical, in-person meetings via the device mic
- `apps/agent` — the bot runtime (headless browser + Zoom/Teams SDK workers)

## Develop

```bash
bun install
bun run dev
```

## License

To be decided — leaning AGPL-3.0 for the core, MIT for `packages/*`.
