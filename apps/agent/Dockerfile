FROM oven/bun:1.2-debian AS base

# System deps for Playwright Chromium + audio capture + Whisper.cpp build.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git build-essential cmake \
      pulseaudio pulseaudio-utils \
      xvfb \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Playwright browsers — we use Chromium only.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN mkdir -p ${PLAYWRIGHT_BROWSERS_PATH}

WORKDIR /workspace

# Install workspace deps. Copy lockfile + package manifests first for cache reuse.
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY apps/agent/package.json apps/agent/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/crypto/package.json packages/crypto/package.json
COPY packages/media/package.json packages/media/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json

RUN bun install --frozen-lockfile

# Install Playwright Chromium AFTER deps so it sees the resolved playwright version.
RUN bunx playwright install --with-deps chromium

# Now copy source.
COPY apps/agent apps/agent
COPY packages/db packages/db
COPY packages/crypto packages/crypto
COPY packages/media packages/media

# Pulse config: create a null sink named 'halsink' on every container start.
COPY apps/agent/docker/pulse.pa /etc/pulse/system.pa
COPY apps/agent/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Where audio dumps live for debugging.
ENV HAL_AUDIO_DIR=/var/lib/hal/audio
RUN mkdir -p /var/lib/hal/audio

WORKDIR /workspace/apps/agent

EXPOSE 8088
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "run", "src/cli.ts", "worker"]
