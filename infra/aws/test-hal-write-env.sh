#!/bin/bash
# Exercise env_is_complete from hal-write-env.sh against fixtures.
#
#   ./infra/aws/test-hal-write-env.sh
#
# The validator is what stands between a half-written environment and a bot
# joining a real meeting under the wrong name, so it gets fixtures rather than
# a read-through. Each case is a way the env file has actually gone wrong, or
# plausibly could.
set -uo pipefail

SRC="${1:-$(dirname "$0")/hal-write-env.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Pull just the validator out of the script (it is self-contained).
sed -n '/^env_is_complete()/,/^}$/p' "$SRC" > "$WORK/validator.sh"
# shellcheck disable=SC1090
. "$WORK/validator.sh"

KEY64=$(printf 'a%.0s' $(seq 1 64))

good() {
  cat <<EOF
KMS_PROVIDER=local
LLM_PROVIDER=gemini
STT_PROVIDER=deepgram
HAL_BOT_DISPLAY_NAME=Hal · AI for {{user}}
HAL_BOT_DISCLOSURE=Hi — I'm Hal.
HAL_PULSE_SINK=halsink
DATABASE_URL=postgresql://u:p@ep-x.c-3.eu-central-1.aws.neon.tech/db
HAL_LOCAL_KMS_KEY=$KEY64
GEMINI_API_KEY=g
DEEPGRAM_API_KEY=d
RESEND_API_KEY=r
HAL_FROM_EMAIL=founder@hallelx2.com
EOF
}

pass=0
fail=0
check() {
  local name="$1" expect="$2" file="$3"
  env_is_complete "$file" >/dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$expect" ]; then
    echo "  ok   $name"
    pass=$((pass + 1))
  else
    echo "  FAIL $name (expected exit $expect, got $got)"
    fail=$((fail + 1))
  fi
}

good > "$WORK/complete.env"
check "complete env accepted" 0 "$WORK/complete.env"

: > "$WORK/empty.env"
check "empty env rejected" 1 "$WORK/empty.env"

check "missing file rejected" 1 "$WORK/does-not-exist.env"

good | grep -v '^HAL_BOT_DISPLAY_NAME=' > "$WORK/nobotname.env"
check "missing HAL_BOT_DISPLAY_NAME rejected" 1 "$WORK/nobotname.env"

good | grep -v '^HAL_BOT_DISCLOSURE=' > "$WORK/nodisclosure.env"
check "missing HAL_BOT_DISCLOSURE rejected" 1 "$WORK/nodisclosure.env"

good | sed 's#^DATABASE_URL=.*#DATABASE_URL=postgresql://u:p@ep-x-pooler.c-3.eu-central-1.aws.neon.tech/db#' > "$WORK/pooler.env"
check "pooler DATABASE_URL rejected" 1 "$WORK/pooler.env"

good | sed 's/^RESEND_API_KEY=.*/RESEND_API_KEY=UNSET/' > "$WORK/unset.env"
check "UNSET placeholder rejected" 1 "$WORK/unset.env"

good | sed 's/^HAL_LOCAL_KMS_KEY=.*/HAL_LOCAL_KMS_KEY=deadbeef/' > "$WORK/shortkey.env"
check "short KMS key rejected" 1 "$WORK/shortkey.env"

good | sed 's/^GEMINI_API_KEY=.*/GEMINI_API_KEY=/' > "$WORK/emptyval.env"
check "empty value rejected" 1 "$WORK/emptyval.env"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
