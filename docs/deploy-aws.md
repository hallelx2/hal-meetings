# Deploying Hal Agent to AWS EC2

Dogfood host. One VM. Not Lambda / Fargate.

See `infra/aws/README.md` for Terraform. Summary:

| | |
|---|---|
| Region | `eu-central-1` (same as Neon) |
| Size | Ubuntu 24.04 `t3.medium` (2 vCPU / 4 GB) |
| Runtime | existing `apps/agent/Dockerfile` (Chromium + Xvfb + Pulse `halsink`) |
| Secrets | SSM `/hal/agent/*` → `/opt/hal/.env` (0600) |
| SSH | your `/32` only. Prefer `aws ssm start-session` |

`infra/oracle` is leftover from Always Free. Do not revive it.

## Browser sandbox

The bot browses Meet, Zoom and whatever a meeting link redirects to, inside a profile signed in to a real account, so its Chromium runs with the sandbox on. The container runs as the unprivileged `hal` user (uid 10001), and `docker-compose.yml` applies `apps/agent/docker/seccomp_profile.json`: Docker's default seccomp profile plus user namespaces, which the sandbox needs. On amd64 the image ships Google Chrome stable (`HAL_BROWSER_CHANNEL=chrome`), so every rebuild takes Chrome's current security fixes.

After a deploy, prove it on the host:

```sh
cd /opt/hal/hal-meetings
docker compose -f apps/agent/docker-compose.yml run --rm hal-agent bun scripts/sandbox-check.ts
```

`PASS` means Chromium reports itself adequately sandboxed as a non-root user. If it fails with "No usable sandbox", the host is refusing unprivileged user namespaces. Ubuntu 24.04 does that through AppArmor (`sysctl kernel.apparmor_restrict_unprivileged_userns`). Grant the container's profile `userns` rather than reaching for `--no-sandbox`: the sandbox is what keeps a hostile page away from the signed-in profile and every key in `/opt/hal/.env`.

The first launch on Google Chrome reuses the Chromium profile in `/opt/hal/chrome-profile`. If Google asks the bot to sign in again, sign in once by hand as before. `HAL_BROWSER_CHANNEL=` (empty) in the env goes back to Playwright's bundled Chromium. Only do that with a fresh profile: Chrome upgrades the profile in place, and an older Chromium may refuse it or lose the session. Move the old one aside (`mv /opt/hal/chrome-profile /opt/hal/chrome-profile.chrome`) and sign in again.

The image's Chrome layer is rebuilt once a week: the systemd unit passes the ISO week as `HAL_CHROME_REFRESH`, which busts that layer. A host set up before this change still runs the old unit. Re-run the unit section of `infra/aws/user-data.sh`, or start it once with `HAL_CHROME_REFRESH=$(date +%G-W%V) docker compose -f apps/agent/docker-compose.yml up -d --build`.
