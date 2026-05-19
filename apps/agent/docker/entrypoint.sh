#!/usr/bin/env bash
set -euo pipefail

# Start a virtual X server so Chromium can run (even in headless mode some
# audio code paths want an X display).
Xvfb :99 -screen 0 1280x800x24 >/var/log/xvfb.log 2>&1 &
export DISPLAY=:99

# Start PulseAudio in system mode using our config.
pulseaudio --system --daemonize --disallow-exit --exit-idle-time=-1 --log-target=stderr 2>/var/log/pulseaudio.log

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
