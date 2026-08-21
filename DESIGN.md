# DESIGN.md — Adora

The written contract the token layer implements. Where this file and the CSS disagree, **this file is right and the CSS is the bug**.

Written 2026-08-21 by reading the system that already existed — the landing page, `packages/design-tokens`, and `packages/ui` — rather than inventing one. The aesthetic below was already shipped; it had simply never been written down, which is why the authenticated surface drifted from it.

---

## 1. Aesthetic

Neo-brutalist, on a bright canvas. Hal is a bot that walks into your meetings and says so out loud, and the interface carries the same posture: blunt, legible, unembarrassed.

Everything sits on **white**. Structure comes from **hard black rules** — 1.5px and 2px, never a soft shadow, never a subtle grey divider. Corners are square or barely rounded; there is no glassmorphism, no gradient, no elevation. Colour arrives in **flat blocks** — lime, violet, pink, air blue — used as whole-panel fills or accent chips, never as a wash or a tint behind text.

Type does the heavy lifting. **PolySans** for display, set tight and large. **Plus Jakarta Sans** for everything else, tracked in at `-0.02em`. Small text is **uppercase with wide word-spacing** and carries labels, statuses and eyebrows. The wordmark is its own face entirely.

The tell of the system is the black rule and the flat fill. If a surface needs a shadow to separate itself from the page, the design has gone wrong.

## 2. Where the tokens live

| Layer | File | Purpose |
|---|---|---|
| Primitives | `packages/design-tokens/src/tokens.css` | Plain CSS custom properties. **Framework-free on purpose** — a future Expo/NativeWind app reads the same names, so web and mobile cannot drift. |
| Tailwind bridge | `packages/design-tokens/src/theme.css` | Tailwind v4 `@theme` block exposing the same values as utilities. |
| App | `apps/web/src/app/globals.css` | Imports both, then base layer + signature utilities. |

There is **no `tailwind.config.js`** and must not be. Tailwind v4 `@theme` is the only bridge.

## 3. The three layers

1. **Primitives** — the raw ramp: `--color-lush-green`, `--color-action-violet`, `--text-display-lg`. Never referenced from a component.
2. **Semantic roles** — what a thing *is*: canvas, ink, border, accent.
3. **Utilities** — what components actually type: `bg-lush-green`, `brutal-border`, `tracking-adora`.

> **Known gap.** Layer 2 is thin. Most components reach past it and use primitives directly (`bg-lush-green` rather than `bg-accent-positive`). That is survivable at this size and is the first thing to fix if a second theme is ever wanted, because a theme swap re-points semantic roles — and there is currently little to re-point. Recorded in §8 rather than quietly tolerated.

## 4. Theming — one mode, deliberately

**The app is single-mode. Light is the only theme, and that is a design decision, not an omission.**

`globals.css` sets `color-scheme: light`. The identity is a white canvas with black rules; inverted, it stops being the same product. A dark theme is not "a drop-in that hasn't been done" — it is **not built and not planned**, and this file says so rather than implying otherwise.

If dark is ever wanted, the work is: introduce the semantic layer properly (§3), then re-declare **only** those roles under `:root[data-theme="dark"]`. Never `dark:` variants scattered through JSX, never a component branching on theme.

## 5. Component conventions

- Shared primitives live in **`packages/ui`** and are consumed by the app via `@hal/ui`. Currently `Button`, `LinkButton`, `Badge`, `AccentCard`, `cn`.
- A component starts in `apps/web/src/module/<feature>/components/`. It moves to `packages/ui` only when a **second** feature needs it. Never pre-promote.
- Variation is a **variant on the component**, never utilities at the call site. `<Badge tone="aqua">`, not `<span className="text-aqua-blue border-aqua-blue/40">`.
- Chrome — sidebar, top bar, dock — is rendered **once by the layout that owns it**, never by a screen. A screen with its own nav has re-implemented the shell.

### Layout guards every custom control carries

Handoff-style CSS is written at one width. Three failures are near-certain without guards:

- A content-sized box beside an input needs `shrink-0`, and the input needs `min-w-0`.
- Two- or three-word button labels need `whitespace-nowrap`, and the row needs a defined behaviour when it no longer fits.
- A bordered control beside a borderless one needs the borderless one to carry a **transparent** border, or they differ by 2px in height at every width.

## 6. Migration mapping — violations already in the tree

These are token-layer breaches that exist today. Listed so they are fixed deliberately, not discovered.

| Where | Current | Should be |
|---|---|---|
| `globals.css` `.brutal-border`, `.brutal-border-2`, `.brutal-divider` | hardcoded `#0b0b0b` | `var(--color-ink)` |
| `globals.css` `@theme` | `--color-ink`, `--color-ink-soft` defined in the **app** | belong in `packages/design-tokens` — as app-local values, mobile cannot see the two most-used colours in the system |
| `packages/ui/src/badge.tsx` | `text-[#5c8a04]` for the electric tone | a token; an arbitrary hex inside a shared primitive is the exact thing the system exists to prevent |

## 7. Explicit exclusions

- **Emails are hardcoded and stay hardcoded.** Email clients strip CSS custom properties. This is correct, not debt.
- **The landing page's bespoke animations** — `drift`, `marquee`, `line-in`, `cursor-blink`, `sketch-underline` — stay as utilities in `globals.css`. They are one-surface signature effects, not system primitives.

## 8. Status

| Item | State |
|---|---|
| Primitive ramp | **Done** — `packages/design-tokens` |
| Tailwind v4 `@theme` bridge | **Done** |
| Semantic role layer | **Thin** — components mostly use primitives directly (§3) |
| Shared primitives (`packages/ui`) | **Partial** — Button, Badge, AccentCard. No card, empty state, or page header yet |
| Landing page on tokens | **Done** |
| Authenticated app on tokens | **In progress** — HAL-829 |
| Dark theme | **Not built, not planned** (§4) |
| Violations in §6 | **Open** |
