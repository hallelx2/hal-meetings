# Hal Agent — AWS EC2 dogfood host

Oracle Always Free is leftover (`infra/oracle`). This module is the dogfood host: one Ubuntu 24.04 `t3.medium` in `eu-central-1` running the existing `apps/agent/Dockerfile`. Not Lambda, not Fargate — Pulse + Xvfb need a VM.

Secrets live in SSM (`/hal/agent/*`). They are never in userdata or `*.tfvars`.

## One-time

```powershell
# key pair (private key stays on your laptop)
aws ec2 create-key-pair --region eu-central-1 --key-name hal-agent --query KeyMaterial --output text | Set-Content -LiteralPath $env:USERPROFILE\.ssh\hal-agent.pem
icacls $env:USERPROFILE\.ssh\hal-agent.pem /inheritance:r /grant:r "$env:USERNAME:R"

cd infra/aws
Copy-Item terraform.tfvars.example terraform.tfvars
# set ssh_cidr to YOUR_IP/32 (never 0.0.0.0/0)
```

Push secrets (from Vercel production / `apps/web/.env` — do not commit):

```powershell
.\scripts\push-hal-ssm-secrets.ps1
```

## Apply

```powershell
cd infra/aws
terraform init
terraform apply
```

First boot builds the Chromium image (~8–12 min). Then:

```
aws ssm start-session --region eu-central-1 --target <instance_id>
# or
ssh -i ~/.ssh/hal-agent.pem ubuntu@<eip>
sudo docker compose -f /opt/hal/hal-meetings/apps/agent/docker-compose.yml logs -f
```

SSH is open only to `ssh_cidr`. Prefer SSM (no inbound port).

## Tear down

```powershell
terraform destroy
```
