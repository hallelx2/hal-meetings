#!/usr/bin/env bash
# Hal Agent — Oracle Cloud Ubuntu 22.04 VM bootstrap.
# Idempotent: safe to re-run. Designed for a fresh Ampere ARM instance.
#
# Usage on the VM:
#   curl -fsSL https://raw.githubusercontent.com/hallelx2/hal-meetings/main/scripts/oracle-vm-bootstrap.sh | bash

set -euo pipefail

log() { printf "\033[1;36m[bootstrap]\033[0m %s\n" "$*"; }
ok()  { printf "\033[1;32m[ ok ]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }

if [[ $EUID -eq 0 ]]; then
  warn "Run this as the 'ubuntu' user, not root. It will use sudo where needed."
fi

# -----------------------------------------------------------------------------
log "Updating apt packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q

# -----------------------------------------------------------------------------
log "Installing baseline tools"
sudo apt-get install -y -q \
  curl ca-certificates gnupg lsb-release \
  htop tmux git unzip jq \
  unattended-upgrades

# -----------------------------------------------------------------------------
log "Installing Docker engine + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -q
  sudo apt-get install -y -q \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ok "docker installed: $(docker --version)"
else
  ok "docker already present: $(docker --version)"
fi

if ! groups "$USER" | grep -q docker; then
  log "Adding $USER to docker group"
  sudo usermod -aG docker "$USER"
  warn "Log out and back in so the docker group takes effect, then re-run this script if anything was skipped."
fi

# -----------------------------------------------------------------------------
log "Fixing Oracle Ubuntu's iptables (Docker bridge networking is blocked by default)"
# Oracle's base image installs a firewall ruleset that drops forward traffic,
# which kills docker bridge networking. Open the FORWARD chain.
if sudo iptables -L FORWARD -n | grep -qE "^DROP\s+all"; then
  sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT || true
  sudo iptables -I FORWARD 1 -i docker0 -o docker0 -j ACCEPT || true
  sudo iptables -I FORWARD 1 -i docker0 -j ACCEPT || true
  sudo iptables -I FORWARD 1 -o docker0 -j ACCEPT || true
  # Persist iptables
  sudo apt-get install -y -q iptables-persistent
  sudo netfilter-persistent save || true
  ok "iptables patched + persisted"
else
  ok "iptables already permissive"
fi

# -----------------------------------------------------------------------------
log "Configuring 4 GB swap (defensive — 24 GB RAM means rarely needed)"
if [[ ! -f /swapfile ]]; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ok "4 GB swap added"
else
  ok "swap already present: $(free -h | awk '/Swap:/ {print $2}')"
fi

# -----------------------------------------------------------------------------
log "Enabling unattended security upgrades"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
sudo systemctl enable --now unattended-upgrades
ok "unattended-upgrades active"

# -----------------------------------------------------------------------------
log "Configuring log rotation for docker"
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
EOF
sudo systemctl restart docker
ok "docker log rotation set (20m × 5 files per container)"

# -----------------------------------------------------------------------------
log "All done."
echo
echo "Next steps:"
echo "  1. Log out and back in so the docker group activates:"
echo "       exit"
echo "       ssh -i ~/.ssh/hal-oracle ubuntu@\$VM_IP"
echo "  2. Clone the repo + configure env:"
echo "       git clone https://github.com/hallelx2/hal-meetings.git"
echo "       cd hal-meetings/apps/agent && cp .env.example .env"
echo "       nano .env   # paste values from Vercel"
echo "  3. Bring up the agent:"
echo "       docker compose -f apps/agent/docker-compose.yml up -d --build"
echo "  4. Tail the logs to verify:"
echo "       docker compose -f apps/agent/docker-compose.yml logs -f hal-agent"
echo
echo "See docs/deploy-oracle.md for the full walkthrough."
