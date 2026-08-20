#!/bin/bash
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive
REGION="${region}"
SSM_PATH="${ssm_path}"
GIT_REPO="${git_repo_url}"
GIT_BRANCH="${git_branch}"

apt-get update -y
apt-get install -y ca-certificates curl gnupg git jq unzip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu
systemctl enable --now docker

cat >/etc/docker/daemon.json <<'EOF'
{"log-driver":"json-file","log-opts":{"max-size":"20m","max-file":"5"}}
EOF
systemctl restart docker

if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
fi

mkdir -p /opt/hal
chmod 700 /opt/hal

# Where hal-write-env looks up the region and SSM prefix. Kept out of the unit
# file so the service definition never has to change when either moves.
umask 077
cat >/opt/hal/agent.conf <<EOF
REGION=$REGION
SSM_PATH=$SSM_PATH
EOF
chmod 600 /opt/hal/agent.conf

# The checkout comes before the environment now: hal-write-env lives in the repo
# so that a `git pull` updates it, which means the repo has to exist first.
if [ ! -d /opt/hal/hal-meetings/.git ]; then
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" /opt/hal/hal-meetings
else
  git -C /opt/hal/hal-meetings fetch origin "$GIT_BRANCH"
  git -C /opt/hal/hal-meetings checkout "$GIT_BRANCH"
  git -C /opt/hal/hal-meetings pull --ff-only origin "$GIT_BRANCH"
fi
chown -R ubuntu:ubuntu /opt/hal/hal-meetings

chmod 755 /opt/hal/hal-meetings/infra/aws/hal-write-env.sh
/opt/hal/hal-meetings/infra/aws/hal-write-env.sh

cat >/etc/systemd/system/hal-agent.service <<'EOF'
[Unit]
Description=Hal Agent (docker compose)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hal/hal-meetings
# Re-derive the environment on every start. Without this the worker runs on
# whatever /opt/hal/.env happened to contain at first boot, and a corrected SSM
# parameter never reaches it.
ExecStartPre=/opt/hal/hal-meetings/infra/aws/hal-write-env.sh
ExecStart=/usr/bin/docker compose -f apps/agent/docker-compose.yml up -d --build
ExecStop=/usr/bin/docker compose -f apps/agent/docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hal-agent
systemctl start hal-agent
