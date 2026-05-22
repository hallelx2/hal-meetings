#!/usr/bin/env bash
# Oracle ARM "Out of host capacity" retry loop.
#
# The Always Free Ampere A1.Flex shapes are in constant demand. This script
# retries `terraform apply` across all availability domains until the instance
# launches, then stops. Networking is created once and reused — only the
# instance launch is retried, so each attempt is fast.
#
# Usage:
#   bash retry-apply.sh            # retries forever, 4 min between full rounds
#   MAX_ROUNDS=20 bash retry-apply.sh   # give up after 20 rounds
#
# Keep your laptop awake while this runs (disable sleep), or run it on a box
# that stays on.

set -uo pipefail
cd "$(dirname "$0")"

TF="${TERRAFORM_BIN:-$HOME/scoop/shims/terraform}"
ADS=(0 1 2)                 # availability domain indices to rotate
SLEEP_BETWEEN_ROUNDS="${SLEEP_BETWEEN_ROUNDS:-240}"  # 4 min
MAX_ROUNDS="${MAX_ROUNDS:-0}"  # 0 = infinite

round=0
while true; do
  round=$((round + 1))
  echo "================ ROUND $round ($(date -u +%H:%M:%S)) ================"
  for ad in "${ADS[@]}"; do
    echo "--- trying availability domain index $ad ---"
    if "$TF" apply -auto-approve -no-color -var="availability_domain_index=$ad" 2>&1 | tee /tmp/hal-tf-apply.log | grep -qE "Apply complete!"; then
      echo "SUCCESS: instance launched in AD index $ad"
      "$TF" output
      exit 0
    fi
    if grep -qE "Out of host capacity" /tmp/hal-tf-apply.log; then
      echo "AD $ad: out of capacity, trying next AD"
      continue
    fi
    # Some OTHER error (auth, quota, network) — surface it and stop.
    if grep -qE "Error:" /tmp/hal-tf-apply.log; then
      echo "Non-capacity error encountered — stopping so you can inspect:"
      grep -A4 "Error:" /tmp/hal-tf-apply.log | head -20
      exit 1
    fi
  done

  if [[ "$MAX_ROUNDS" -gt 0 && "$round" -ge "$MAX_ROUNDS" ]]; then
    echo "Gave up after $round rounds. Capacity never opened up. Try again later or a smaller shape."
    exit 2
  fi
  echo "All ADs out of capacity. Sleeping ${SLEEP_BETWEEN_ROUNDS}s before round $((round + 1))..."
  sleep "$SLEEP_BETWEEN_ROUNDS"
done
