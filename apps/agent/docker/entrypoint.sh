#!/usr/bin/env bash
set -euo pipefail

# Root phase: hand the mounted volumes to the bot user, then re-exec as it.
# Chromium only starts its sandbox as a non-root user (see the Dockerfile).
if [ "$(id -u)" = 0 ]; then
  # Only files not already hal's, so a large profile isn't re-walked into
  # chown on every start. The env can move each of these dirs.
  for dir in /data/chrome-profile /var/lib/hal/audio /tmp/hal-audio \
    "${HAL_USER_DATA_DIR:-}" "${HAL_AUDIO_DIR:-}" "${HAL_DIAGNOSTICS_DIR:-}"; do
    if [ -n "$dir" ] && [ -d "$dir" ]; then
      find "$dir" \! -user hal -exec chown -h hal:hal {} +
    fi
  done
  mkdir -p /run/user/10001 && chown hal:hal /run/user/10001 && chmod 700 /run/user/10001
  install -d -o hal -g hal /var/log/hal
  exec setpriv --reuid=hal --regid=hal --init-groups env HOME=/home/hal USER=hal "$0" "$@"
fi

# Google Chrome when the image has it (amd64), unless the env chose otherwise.
# Set HAL_BROWSER_CHANNEL= (empty) to force Playwright's bundled Chromium.
if [ -z "${HAL_BROWSER_CHANNEL+set}" ] && [ -x /opt/google/chrome/chrome ]; then
  export HAL_BROWSER_CHANNEL=chrome
fi

# Start a virtual X server so Chromium can run (even in headless mode some
# audio code paths want an X display).
Xvfb :99 -screen 0 1280x800x24 >/var/log/hal/xvfb.log 2>&1 &
export DISPLAY=:99

export XDG_RUNTIME_DIR=/run/user/$(id -u)
pulseaudio --daemonize=yes --exit-idle-time=-1 --log-target=stderr --use-pid-file=yes \
  --file=/etc/pulse/system.pa >/var/log/hal/pulseaudio.log 2>&1 || {
  echo "[entrypoint] pulseaudio failed:" >&2
  cat /var/log/hal/pulseaudio.log >&2 || true
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
