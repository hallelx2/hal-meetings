#!/bin/bash
# Regenerate /opt/hal/.env for the Hal agent from SSM plus the static block.
#
# This runs as ExecStartPre of hal-agent.service, so every service start
# re-derives the environment. A hand-edited or half-written env file survives
# at most one restart, and a corrected SSM parameter reaches the worker without
# anyone having to remember which file to touch.
#
# Reads REGION and SSM_PATH from /opt/hal/agent.conf (written by user-data).
# Writes atomically: on any failure the previous env file is left in place, so
# a transient SSM outage cannot take a working host down.

set -euo pipefail

CONF=/opt/hal/agent.conf
ENV_FILE=/opt/hal/.env
REPO_DIR=/opt/hal/hal-meetings
AGENT_ENV="$REPO_DIR/apps/agent/.env"

if [ ! -r "$CONF" ]; then
  echo "hal-write-env: $CONF missing; cannot resolve region/ssm path" >&2
  exit 1
fi
# shellcheck disable=SC1090
. "$CONF"
: "${REGION:?hal-write-env: REGION not set in $CONF}"
: "${SSM_PATH:?hal-write-env: SSM_PATH not set in $CONF}"

# The agent is a long-lived worker with its own connection pool, so it must talk
# to Neon's direct endpoint. The pooler is for serverless callers (the web app),
# and double-pooling through PgBouncer is called out as a known failure mode in
# docs/deploy-oracle.md. Normalising here means a pooler URL in SSM — the easy
# mistake, since apps/web/.env legitimately holds one — still cannot reach the
# worker.
strip_pooler() {
  sed -E 's/^(DATABASE_URL=.*)-pooler(\.[^@]*)$/\1\2/'
}

TMP="$(mktemp /opt/hal/.env.XXXXXX)"
trap 'rm -f "$TMP"' EXIT
chmod 600 "$TMP"

fetch_env() {
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
      | jq -r '.[] | (.Name | split("/")[-1]) + "=" + .Value' \
      | strip_pooler
  } > "$TMP"
}

# Every variable the worker cannot start without. Checked before the file is
# promoted, so a partial SSM read never becomes the live env.
env_is_complete() {
  local required=(
    KMS_PROVIDER
    LLM_PROVIDER
    STT_PROVIDER
    HAL_BOT_DISPLAY_NAME
    HAL_BOT_DISCLOSURE
    HAL_PULSE_SINK
    DATABASE_URL
    HAL_LOCAL_KMS_KEY
    GEMINI_API_KEY
    DEEPGRAM_API_KEY
    RESEND_API_KEY
    HAL_FROM_EMAIL
  )
  local key
  for key in "${required[@]}"; do
    if ! grep -qE "^$key=.+" "$TMP"; then
      echo "hal-write-env: $key missing or empty" >&2
      return 1
    fi
    if grep -qE "^$key=UNSET$" "$TMP"; then
      echo "hal-write-env: $key is still the UNSET placeholder" >&2
      return 1
    fi
  done
  if ! grep -qE '^HAL_LOCAL_KMS_KEY=[0-9a-fA-F]{64}$' "$TMP"; then
    echo "hal-write-env: HAL_LOCAL_KMS_KEY is not 32 bytes of hex" >&2
    return 1
  fi
  if grep -qE '^DATABASE_URL=.*-pooler\.' "$TMP"; then
    echo "hal-write-env: DATABASE_URL still points at the Neon pooler" >&2
    return 1
  fi
  return 0
}

# First boot races the SSM parameters being pushed, so retry rather than fail
# the unit. ~5 minutes total.
attempts="${HAL_WRITE_ENV_ATTEMPTS:-30}"
# A garbage override falls through to the "keep the existing env" path anyway,
# because a failing command substitution in a for-list does not trip set -e.
# Say so deliberately instead of relying on that, and skip seq's stderr noise.
if ! [[ "$attempts" =~ ^[0-9]+$ ]]; then
  echo "hal-write-env: HAL_WRITE_ENV_ATTEMPTS='$attempts' is not a non-negative integer; not retrying" >&2
  attempts=0
fi
for i in $(seq 1 "$attempts"); do
  if fetch_env && env_is_complete; then
    mv "$TMP" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    trap - EXIT
    if [ -d "$REPO_DIR/apps/agent" ]; then
      install -m 600 "$ENV_FILE" "$AGENT_ENV"
      chown ubuntu:ubuntu "$AGENT_ENV"
    fi
    echo "hal-write-env: wrote $ENV_FILE"
    exit 0
  fi
  echo "hal-write-env: env incomplete, retry $i/$attempts" >&2
  sleep 10
done

# Never leave the host worse than we found it: if a usable env already exists,
# start on it rather than refusing to boot.
if [ -s "$ENV_FILE" ]; then
  echo "hal-write-env: giving up on SSM; keeping the existing $ENV_FILE" >&2
  exit 0
fi

echo "hal-write-env: no usable environment could be written" >&2
exit 1
