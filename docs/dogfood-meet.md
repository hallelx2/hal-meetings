# Dogfood: one live Google Meet ([HAL-779](https://linear.app/hallelx2/issue/HAL-779))

The join pipeline is written. This is how you prove it.

Windows cannot run PulseAudio/`parec` on the host. Use the agent Docker image (Linux) or wait for the AWS EC2 host ([HAL-784](https://linear.app/hallelx2/issue/HAL-784)).

## You need

1. Neon `DATABASE_URL` (same as the rest of Hal)
2. The same `HAL_LOCAL_KMS_KEY` (64 hex chars) used anywhere else that encrypts
3. `DEEPGRAM_API_KEY` or a local Whisper binary + model
4. `GEMINI_API_KEY` (or another `LLM_PROVIDER`)
5. Optional: `RESEND_API_KEY` — without it the session still completes, no email
6. A Meet **you host**, so you can admit the guest bot

## Seed a user

From the repo root, with `apps/agent/.env` filled from `.env.example`:

```bash
bun run --filter @hal/agent seed-user -- --email you@example.com --name "Halleluyah"
```

It prints a `user id`. That is `--user` below.

## Run (Docker)

```bash
docker compose -f apps/agent/docker-compose.yml up -d --build
# or one-shot:
docker compose -f apps/agent/docker-compose.yml run --rm agent \
  bun run src/cli.ts join \
  --url 'https://meet.google.com/xxx-yyyy-zzz' \
  --user '<uuid>' \
  --platform meet \
  --mode listen \
  --title 'Hal dogfood'
```

Admit **Hal · AI for &lt;you&gt;** from the lobby. Speak two sentences. In chat type `/hal stop`.

## Check

```sql
SELECT id, status FROM meetings ORDER BY created_at DESC LIMIT 1;
SELECT octet_length(content_ct) > 0 AND summary_ct IS NOT NULL AS ok
  FROM transcripts WHERE meeting_id = '<id>';
SELECT action FROM audit_log WHERE meeting_id = '<id>' ORDER BY created_at;
```

Expect `bot_joined`, `bot_disclosed`, `transcript_created`, and `email_sent` if Resend is set.

Comment the meeting id, transcript id, and email id on HAL-779.
