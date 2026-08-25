# Google OAuth — Hal (`hal.hallelx2.com`)

Wave 1 is identity + Calendar **read**. Do not add Gmail send/modify.

Auth code that reads these env vars: [HAL-800](https://linear.app/hallelx2/issue/HAL-800).

## Copy these into Google Cloud

Consent screen:

| Field | Value |
|---|---|
| App name | `Hal` |
| User support email | `founder@hallelx2.com` |
| Developer contact | `founder@hallelx2.com` |
| App home | `https://hal.hallelx2.com` |
| Privacy | `https://hal.hallelx2.com/privacy` |
| Testing users (until published) | your personal Gmail + `founder@hallelx2.com` |

Enable API: **Google Calendar API** (APIs & Services → Library). That only turns the API on. Scopes are a second step.

OAuth client type: **Web application**.

Authorized JavaScript origins — paste both:

```
http://localhost:3000
https://hal.hallelx2.com
```

Authorized redirect URIs — paste both:

```
http://localhost:3000/api/auth/callback/google
https://hal.hallelx2.com/api/auth/callback/google
```

## Scopes — gcloud cannot set these

Project `hal-selfhost` (`1027492867730`) already has **Google Calendar API** enabled. There is **no public gcloud/API** for Google Auth Platform → Data Access. `gcloud iam oauth-clients` is a different product (GCP IAM clients), not Sign in with Google.

For an app in **Testing**, you do not need to tick scopes in the console. Better Auth will request them in the OAuth URL; Google will show them on consent.

Add them in the console only when you **publish** (verification). Until then skip Data Access.

1. Left nav → **Google Auth Platform** (or **APIs & Services → OAuth consent screen**)
2. **Data Access** (or **Edit app → Scopes → Add or remove scopes**)
3. Filter/search and tick **only** these five:

| Search for | Scope string |
|---|---|
| `openid` | `openid` |
| `userinfo.email` | `https://www.googleapis.com/auth/userinfo.email` |
| `userinfo.profile` | `https://www.googleapis.com/auth/userinfo.profile` |
| `calendar.readonly` | `https://www.googleapis.com/auth/calendar.readonly` |
| `calendar.events.readonly` | `https://www.googleapis.com/auth/calendar.events.readonly` |

4. **Update** → **Save**.

Skip this section until you publish. Do **not** add Gmail or calendar write.

## Env

`apps/web/.env` (local — already opened in VS Code):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<already generated in that file>
DATABASE_URL=
```

Vercel project `hal-meetings` (production):

```
GOOGLE_CLIENT_ID=<same client id>
GOOGLE_CLIENT_SECRET=<same client secret>
BETTER_AUTH_URL=https://hal.hallelx2.com
BETTER_AUTH_SECRET=<a different 32+ byte secret>
DATABASE_URL=<Neon direct URL, not the pooler>
```

## After HAL-800

1. `bun run dev` → `/login` → Google
2. Production: `https://hal.hallelx2.com/login`
3. One `oauth_tokens` row, `provider=google`, ciphertext not plaintext

If Google says access blocked: app is in Testing and that account is not a test user.
