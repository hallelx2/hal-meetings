import pino, { type Logger as PinoLogger } from 'pino';
import { STRUCTURED_REDACT_PATHS } from '@hal/crypto';

export type Logger = PinoLogger;

export interface LoggerOptions {
  level?: string;
  pretty?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Build a logger configured with the project-wide redaction paths from
 * @hal/crypto. We use pino because:
 *   - It's the fastest structured logger for Node.
 *   - It supports path-based redaction (so we don't accidentally log tokens).
 *   - JSON output is grep/jq-friendly for ops.
 */
export function createLogger(opts: LoggerOptions = {}): Logger {
  const level = opts.level ?? process.env.LOG_LEVEL ?? 'info';
  const pretty = opts.pretty ?? process.env.NODE_ENV !== 'production';

  return pino({
    level,
    base: { ...opts.context, service: 'hal-agent' },
    redact: {
      paths: [...STRUCTURED_REDACT_PATHS],
      censor: '<redacted>',
    },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname,service',
            },
          },
        }
      : {}),
  });
}
