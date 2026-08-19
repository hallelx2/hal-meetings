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
