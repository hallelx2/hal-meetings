#!/usr/bin/env bash
set -euo pipefail

# Start a virtual X server so Chromium can run (even in headless mode some
# audio code paths want an X display).
Xvfb :99 -screen 0 1280x800x24 >/var/log/xvfb.log 2>&1 &
export DISPLAY=:99

mkdir -p /var/run/pulse /run/user/0
export XDG_RUNTIME_DIR=/run/user/0
pulseaudio --daemonize=yes --exit-idle-time=-1 --log-target=stderr --use-pid-file=yes \
  --file=/etc/pulse/system.pa >/var/log/pulseaudio.log 2>&1 || {
  echo "[entrypoint] pulseaudio failed:" >&2
  cat /var/log/pulseaudio.log >&2 || true
  exit 1
}

# Wait briefly for pulse to initialize.
for i in 1 2 3 4 5; do
  if pactl info >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# Sanity check: the halsink should exist.
if ! pactl list short sinks | grep -q halsink; then
  echo "[entrypoint] halsink not present after pulse start; aborting" >&2
  pactl list short sinks
  exit 1
fi

echo "[entrypoint] pulse + xvfb ready; starting: $*"
exec "$@"
