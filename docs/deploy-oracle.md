# Deploying Hal Agent to Oracle Cloud Always Free

This walkthrough takes you from "no account" to "Hal agent running 24/7 on a free ARM VM with 24 GB RAM." End-to-end estimate: ~45 min the first time.

## Why Oracle Always Free

| | |
|---|---|
| Cost | $0/month, **forever** (not 12 months like AWS) |
| Specs | Ampere ARM, **4 OCPUs / 24 GB RAM / 200 GB storage** — fits all of Hal with room for local Whisper + Ollama if you want them |
| Catches | Capacity is region-dependent (Frankfurt usually has it); idle instances may be reclaimed; ARM-only |
| Card | Required for verification at signup, but Oracle **does not auto-bill** when you cross free-tier limits — they just stop services |

The ARM-only requirement matters in theory but not for us: Hal's Dockerfile uses `oven/bun:1.2-debian` (multi-arch), Playwright ships ARM Chromium binaries, and every Debian package in our image has an arm64 build. No code changes.

---

## Step 1 — Sign up for Oracle Cloud (15 min)

1. Go to https://signup.oraclecloud.com
2. Fill in details. **Use `oludeledarasimi5@gmail.com`** (your personal email, matches the Render account)
3. Pick a **home region** carefully — this is permanent and affects ARM capacity:
   - **`Germany Central (Frankfurt)`** ← recommended (matches your Neon DB region for low latency, usually has ARM capacity)
   - `UK South (London)` — backup if Frankfurt rejects
   - `US East (Ashburn)` — last resort
4. Credit card verification (no charge). Sometimes Oracle's payment validator rejects cards from Nigerian banks — if so, retry with a different card or contact their support (it can take 1-2 days to resolve)
5. Confirm email, log into https://cloud.oracle.com

## Step 2 — Generate an SSH key locally (2 min)

Oracle's instance launch will ask for your public SSH key. Generate one if you don't have one yet:

```bash
# In your local terminal
ssh-keygen -t ed25519 -C "hal-oracle" -f ~/.ssh/hal-oracle
# Press Enter for no passphrase (or set one — your call)

# Print the public key — you'll paste this into Oracle
cat ~/.ssh/hal-oracle.pub
```

The private key (`~/.ssh/hal-oracle`) stays on your laptop, never shared.

## Step 3 — Launch the Ampere ARM instance (10 min)

1. In Oracle Cloud Console: **menu → Compute → Instances**
2. Click **Create instance**
3. Configure:
   - **Name:** `hal-agent`
   - **Compartment:** root (default is fine)
   - **Image:** click "Edit" → "Change image" → **Canonical Ubuntu 22.04** (LTS, stable, our Dockerfile tested against Debian-family)
   - **Shape:** click "Edit" → "Change shape" → **"Ampere"** tab → **`VM.Standard.A1.Flex`**
     - OCPUs: **4**
     - Memory (GB): **24**
   - **Networking:** keep defaults. Make sure "Assign a public IPv4 address" is checked (it is by default)
   - **SSH keys:** **"Paste public keys"** and paste the contents of `~/.ssh/hal-oracle.pub`
   - **Boot volume:** leave as default (47 GB, expandable)
4. Click **Create**

**If you see "Out of capacity":** Oracle's ARM capacity in some regions fluctuates. Two responses:
- Wait an hour and retry
- Try a smaller shape (2 OCPU / 12 GB) — still free, still fits Hal
- Switch home region (only possible during the initial signup window)

When the instance state goes **green / Running**, copy the **Public IP** from the instance details page.

## Step 4 — Open the firewall for outbound HTTPS (5 min)

The agent only makes outbound HTTPS connections (no inbound ports needed) — but Oracle's default VCN is locked down. We need to confirm outbound is allowed:

1. In the instance details, click **"Virtual cloud network"** under Primary VNIC
2. Click the listed **subnet** → **Default security list**
3. Verify there's an **egress** rule: destination `0.0.0.0/0`, all protocols (there usually is by default)
4. If you want to SSH in later from anywhere: add an **ingress** rule for **TCP port 22** from `0.0.0.0/0` (or restrict to your IP for better security)

Skip configuring inbound 80/443 — Hal's agent doesn't serve traffic, it just talks outward to Neon, Gemini, Deepgram, Meet, etc.

## Step 5 — SSH in and bootstrap (10 min)

```bash
# From your local laptop
ssh -i ~/.ssh/hal-oracle ubuntu@<public-ip>
```

First connection asks "Are you sure you want to continue connecting?" — yes.

Once in, run the bootstrap script (it's in this repo):

```bash
# On the Oracle VM
curl -fsSL https://raw.githubusercontent.com/hallelx2/hal-meetings/main/scripts/oracle-vm-bootstrap.sh | bash
```

This script:
- Updates apt packages
- Installs Docker + docker-compose-plugin
- Adds the ubuntu user to the docker group
- Configures iptables to actually pass docker traffic (Oracle's Ubuntu image has a quirk that blocks docker bridge by default)
- Adds a 4 GB swap file (defensive; 24 GB RAM means we shouldn't need it but cheap insurance)
- Configures automatic security updates
- Sets up log rotation for /var/log

After it finishes, log out and back in (`exit` then re-ssh) so the docker group takes effect.

## Step 6 — Configure the agent's env (5 min)

On the VM:

```bash
git clone https://github.com/hallelx2/hal-meetings.git
cd hal-meetings/apps/agent
cp .env.example .env
nano .env   # paste in values from Vercel
```

The required env vars (paste values from your existing Vercel project — see `vercel env pull` instructions in the main README):

```
DATABASE_URL=postgresql://neondb_owner:...@ep-late-scene-al3rnn2e.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
KMS_PROVIDER=local
HAL_LOCAL_KMS_KEY=<MUST match the one in Vercel — pull it from there>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<same as Vercel>
GEMINI_MODEL=gemini-2.5-flash
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=<same as Vercel>
RESEND_API_KEY=<same as Vercel>
HAL_FROM_EMAIL=hal@hal-meetings.com
HAL_BOT_DISPLAY_NAME=Hal · AI
HAL_PULSE_SINK=halsink
LOG_LEVEL=info
NODE_ENV=production
```

**Critical:** Use the **direct** (unpooled) Neon URL on the VM, not the `-pooler` one. The pooler is for serverless functions; our long-lived worker keeps its own pool and shouldn't double-pool.

To pull `HAL_LOCAL_KMS_KEY` from Vercel safely:

```bash
# On your laptop (NOT the VM)
cd "C:/Users/HomePC/Documents/organisation-projects/read-ai-alt/apps/web"
vercel env pull .env.production --environment=production
# Open .env.production, copy the HAL_LOCAL_KMS_KEY value, scp it to the VM,
# then delete the local file.
rm .env.production
```

## Step 7 — Build and run (5 min)

```bash
cd ~/hal-meetings
docker compose -f apps/agent/docker-compose.yml up -d --build
```

First build takes ~5-10 min (downloading Chromium + base image, compiling deps). Subsequent rebuilds are ~30s thanks to layer caching.

Verify:

```bash
docker compose -f apps/agent/docker-compose.yml ps
docker compose -f apps/agent/docker-compose.yml logs -f hal-agent
```

You should see the worker poll log:

```
{"level":30,"time":..., "service":"hal-agent","msg":"job consumer started","workerId":"hal-agent-1"}
```

If it crashes immediately, the most common causes are:
- Missing/wrong env var — check `docker compose logs hal-agent`
- DATABASE_URL using the pooler endpoint — switch to the direct host
- Postgres can't be reached — check Neon's IP allowlist (default is open, but if you locked it down, allow the VM's public IP)

## Step 8 — Make it survive reboots (2 min)

`docker compose up -d` already restarts on container failure thanks to `restart: unless-stopped` in the compose file. But we also want the docker daemon and the compose project to come back if the VM reboots:

```bash
sudo systemctl enable docker
# Then create a tiny systemd unit that re-runs docker compose up on boot:
sudo tee /etc/systemd/system/hal-agent.service > /dev/null <<'EOF'
[Unit]
Description=Hal Agent (docker compose)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/hal-meetings
ExecStart=/usr/bin/docker compose -f apps/agent/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f apps/agent/docker-compose.yml down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable hal-agent
```

Reboot once to test: `sudo reboot`. After it comes back (~30s), `ssh` in and check `docker compose ps`.

## Updating Hal

When you push new code to `main`, the agent doesn't auto-update (no CI/CD pipeline yet). Run this:

```bash
ssh -i ~/.ssh/hal-oracle ubuntu@<ip>
cd ~/hal-meetings
git pull
docker compose -f apps/agent/docker-compose.yml up -d --build
```

Or use the included helper: `scripts/oracle-vm-update.sh`.

## Monitoring

- **Logs:** `docker compose -f apps/agent/docker-compose.yml logs -f hal-agent`
- **Resource usage:** `docker stats`
- **Disk:** `df -h`
- **System:** `htop` (install with `sudo apt install -y htop`)

If you want push alerts on agent crashes, consider Healthchecks.io (free 20-check tier) — wire a curl in the docker-compose `healthcheck` to ping it every 5 min.

## Tearing it all down

```bash
docker compose -f apps/agent/docker-compose.yml down
# then in Oracle Console: Instances → hal-agent → Terminate
```

Oracle doesn't charge for terminated instances, but the VCN stays around — fine to leave or delete via the console.

## Cost truth-check

The intent is $0/month. Things that could escape Always Free:

- A second running instance counts against the free 4 OCPU / 24 GB pool — adding another ARM VM may push you over
- Outbound data over 10 TB/mo — extremely unlikely for Hal
- Block storage over 200 GB — also unlikely
- Creating a load balancer (not free)

For a single Hal agent VM, you stay at $0 indefinitely.
