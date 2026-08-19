# LEFTOVER — Oracle Cloud Always Free

**Do not use.** The Oracle VM is gone. Dogfood host is `infra/aws` (EC2). Kept only so old docs and state files still resolve.

---

# Hal Agent — Oracle Cloud Terraform module

Provisions a free Ampere ARM VM (4 OCPU / 24 GB) on Oracle Cloud Always Free,
installs Docker, and deploys the Hal agent — all in one `terraform apply`.

Reusable: copy this folder for any future project, change the `runcmd`/env in
`cloud-init.yaml`, and you have free ARM infra for that project too.

## Two manual prerequisites (can't be automated)

### 1. Oracle account (one time)
Sign up at https://signup.oraclecloud.com, verify card, pick **Frankfurt** as
home region. See `docs/deploy-oracle.md` for details.

### 2. API signing key (one time, ~3 min)
Terraform authenticates to OCI with an API key:

```bash
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/hal_api_key.pem 2048
chmod 600 ~/.oci/hal_api_key.pem
openssl rsa -pubout -in ~/.oci/hal_api_key.pem -out ~/.oci/hal_api_key_public.pem
cat ~/.oci/hal_api_key_public.pem
```

Then in the OCI Console:
- Profile (top-right) → **My profile** → **API keys** → **Add API key**
- Choose **Paste a public key**, paste the contents of `hal_api_key_public.pem`
- Click Add → Oracle shows a **configuration preview**. Copy the `fingerprint`,
  `user` OCID, `tenancy` OCID, and `region` from it.

## Install tools

```bash
# Terraform (Windows via scoop)
scoop install terraform
# or: winget install Hashicorp.Terraform
```

(You don't need the `oci` CLI — Terraform's provider talks to OCI directly.)

## Deploy

```bash
cd infra/oracle
cp terraform.tfvars.example terraform.tfvars
# Fill terraform.tfvars with the OCID/fingerprint values from the API-key step,
# plus Hal's secrets (same values as Vercel).

terraform init
terraform apply
```

`apply` takes ~1 min to create the VM, then cloud-init runs for ~8-10 min
installing Docker + building Hal. Terraform prints:

```
public_ip    = "x.x.x.x"
ssh_command  = "ssh -i ~/.ssh/hal-oracle ubuntu@x.x.x.x"
logs_command = "ssh ... docker compose ... logs -f hal-agent"
```

## Verify

```bash
# SSH in and watch cloud-init finish
ssh -i ~/.ssh/hal-oracle ubuntu@<public_ip>
cloud-init status --wait              # blocks until first-boot setup done
sudo systemctl status hal-agent
cd /opt/hal/hal-meetings && sudo docker compose -f apps/agent/docker-compose.yml logs -f hal-agent
```

You want to see: `job consumer started`.

## Update Hal later

```bash
ssh -i ~/.ssh/hal-oracle ubuntu@<public_ip>
cd /opt/hal/hal-meetings
sudo git pull
sudo docker compose -f apps/agent/docker-compose.yml up -d --build
```

## Reusing the free allowance for other projects

The 4 OCPU / 24 GB / 200 GB allowance is **per tenancy**, shared across everything.
Two patterns:

1. **One VM, many projects (recommended):** SSH into this same VM, clone another
   repo to `/opt/<project>`, add another `docker compose` stack. Hal uses ~1-3 GB,
   leaving ~20 GB for other workloads.
2. **Multiple smaller VMs:** split into e.g. two 2-OCPU / 12-GB VMs by copying this
   module with smaller `ocpus`/`memory_gb`. Note the total can't exceed 4 / 24.

## Security notes

- `terraform.tfvars` and `terraform.tfstate*` contain secrets in plaintext. They are
  gitignored. Keep them on your machine; don't share.
- For team use, switch to a remote state backend with encryption (OCI Object Storage
  or Terraform Cloud) and pull secrets from a vault instead of tfvars.
- The VM's `/opt/hal/.env` is `0600` root-only.

## Tear down

```bash
terraform destroy
```

Removes the VM, VCN, and all networking. Oracle bills nothing for destroyed Always-Free resources.
