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

write_env() {
  umask 077
  {
    echo "KMS_PROVIDER=local"
    echo "LLM_PROVIDER=gemini"
    echo "GEMINI_MODEL=gemini-2.5-flash"
    echo "STT_PROVIDER=deepgram"
    echo "HAL_BOT_DISPLAY_NAME=Hal · AI for {{user}}"
    echo "HAL_BOT_DISCLOSURE=Hi — I'm Hal, an AI assistant joining on {{user}}'s behalf. I'm transcribing this meeting. Reply '/hal stop' in chat to remove me."
    echo "HAL_PULSE_SINK=halsink"
    echo "HAL_AUDIO_DIR=/tmp/hal-audio"
    echo "NODE_ENV=production"
    echo "LOG_LEVEL=info"
    aws ssm get-parameters-by-path --region "$REGION" --path "$SSM_PATH" --with-decryption --recursive \
      --query 'Parameters[].{Name:Name,Value:Value}' --output json \
      | jq -r '.[] | (.Name | split("/")[-1]) + "=" + .Value'
  } > /opt/hal/.env
  chmod 600 /opt/hal/.env
}

for i in $(seq 1 30); do
  if aws ssm get-parameter --region "$REGION" --name "$SSM_PATH/DATABASE_URL" --with-decryption >/dev/null 2>&1; then
    write_env
    if grep -qE '^(DATABASE_URL|HAL_LOCAL_KMS_KEY|GEMINI_API_KEY|DEEPGRAM_API_KEY|RESEND_API_KEY)=UNSET$' /opt/hal/.env \
      || ! grep -q '^DATABASE_URL=.' /opt/hal/.env \
      || ! grep -qE '^HAL_LOCAL_KMS_KEY=[0-9a-fA-F]{64}$' /opt/hal/.env; then
      echo "SSM secrets still UNSET, retry $i"
    else
      break
    fi
  fi
  sleep 10
done

if [ ! -d /opt/hal/hal-meetings/.git ]; then
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" /opt/hal/hal-meetings
else
  git -C /opt/hal/hal-meetings fetch origin "$GIT_BRANCH"
  git -C /opt/hal/hal-meetings checkout "$GIT_BRANCH"
  git -C /opt/hal/hal-meetings pull --ff-only origin "$GIT_BRANCH"
fi

cp /opt/hal/.env /opt/hal/hal-meetings/apps/agent/.env
chmod 600 /opt/hal/hal-meetings/apps/agent/.env
chown -R ubuntu:ubuntu /opt/hal/hal-meetings

cat >/etc/systemd/system/hal-agent.service <<'EOF'
[Unit]
Description=Hal Agent (docker compose)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hal/hal-meetings
ExecStart=/usr/bin/docker compose -f apps/agent/docker-compose.yml up -d --build
ExecStop=/usr/bin/docker compose -f apps/agent/docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hal-agent
systemctl start hal-agent
