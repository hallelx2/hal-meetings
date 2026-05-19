import { hostname } from 'node:os';

/**
 * Agent runtime configuration, env-driven. The agent reads only what it needs
 * at startup and validates aggressively — failing fast is better than failing
 * mid-meeting.
 */

export interface AgentConfig {
  // Identity
  agentId: string; // unique per worker process, used in jobs.claimed_by
  env: 'development' | 'staging' | 'production';
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  // Storage
  databaseUrl: string;
  audioStorageDir: string; // where wav files are temporarily dumped pre-encryption

  // Services
  resendApiKey?: string; // for summary email
  fromEmail: string;

  // Pulse / audio
  pulseSink: string; // e.g. 'halsink'

  // Bot identity
  botDisplayName: string; // e.g. "Hal · AI for {{user}}"
  botDisclosure: string; // chat message on join

  // Provider env vars get read inside the @hal/crypto, @hal/media factories.
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const cfg: AgentConfig = {
    agentId: env.HAL_AGENT_ID ?? `${hostname()}-${process.pid}`,
    env: (env.NODE_ENV as AgentConfig['env']) ?? 'development',
    logLevel: (env.LOG_LEVEL as AgentConfig['logLevel']) ?? 'info',

    databaseUrl: required(env, 'DATABASE_URL'),
    audioStorageDir: env.HAL_AUDIO_DIR ?? '/tmp/hal-audio',

    resendApiKey: env.RESEND_API_KEY,
    fromEmail: env.HAL_FROM_EMAIL ?? 'hal@hal-meetings.com',

    pulseSink: env.HAL_PULSE_SINK ?? 'halsink',

    botDisplayName: env.HAL_BOT_DISPLAY_NAME ?? 'Hal · AI',
    botDisclosure:
      env.HAL_BOT_DISCLOSURE ??
      "Hi — I'm Hal, an AI assistant joining on {{user}}'s behalf. I'm transcribing this meeting. Reply '/hal stop' in chat to remove me.",
  };

  return cfg;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) {
    throw new Error(`[@hal/agent] required env var "${name}" not set`);
  }
  return v;
}
