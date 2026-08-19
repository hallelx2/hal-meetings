# Self-host: Google OAuth

Hal does not ship a shared Google app. Every self-host (including your own laptop) creates an OAuth client. Wave 1 only needs identity + Calendar. **Do not request Gmail send or modify.**

The auth code that consumes these env vars is [HAL-800](https://linear.app/hallelx2/issue/HAL-800). This doc is the source of truth for scopes.

## 1. Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, e.g. `hal-selfhost`.
3. APIs & Services → Enable **Google Calendar API**.
4. OAuth consent screen → External (or Internal if you have a Workspace).
   - App name: `Hal`
   - User support email: yours
   - Developer contact: yours
5. While the app is in **Testing**, add your Google account under Test users.

## 2. Scopes (Wave 1 only)

Add these and nothing else:

| Scope | Why |
|---|---|
| `openid` | Sign-in |
| `https://www.googleapis.com/auth/userinfo.email` | Account email |
| `https://www.googleapis.com/auth/userinfo.profile` | Display name |
| `https://www.googleapis.com/auth/calendar.readonly` | List calendars |
| `https://www.googleapis.com/auth/calendar.events.readonly` | List events + Meet URLs |

Do **not** add:

- `gmail.send`, `gmail.modify`, `gmail.compose` — Wave 2 drafts, not Wave 1
- `calendar.events` (write) — Hal does not create calendar events in Wave 1

## 3. OAuth client

1. Credentials → Create credentials → OAuth client ID → **Web application**.
2. Authorized JavaScript origins:
   - `http://localhost:3000`
   - your production origin, e.g. `https://hal.example.com`
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://hal.example.com/api/auth/callback/google`

Copy the client ID and secret.

## 4. Env

In `apps/web/.env` (never commit):

```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<32+ random bytes, hex>
```

Production: same keys in Vercel / your host. `BETTER_AUTH_URL` must match the public origin.

## 5. Verify

After HAL-800 lands:

1. `bun run dev` in `apps/web`
2. Open `/login` → Google
3. Consent the scopes above
4. Confirm one `oauth_tokens` row for provider `google` whose `access_token_ct` is not UTF-8 plaintext

If Google shows “access blocked”, the app is in Testing and your account is not a test user.
