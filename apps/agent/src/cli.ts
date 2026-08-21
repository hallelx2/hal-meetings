#!/usr/bin/env bun
/**
 * hal-agent — the CLI entry point.
 *
 * Two top-level commands:
 *   hal-agent join <url> --user <id> [...]    Run a one-shot session against a meeting URL.
 *   hal-agent worker                          Run as a long-lived job consumer.
 */
import { renderBotName } from '@hal/meeting-links';
import { Command } from 'commander';
import { hostname } from 'node:os';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { createDb, makeRepositories } from '@hal/db';
import { createKmsFromEnv, createEnvelopeService } from '@hal/crypto';
import { createSttFromEnv, createLlmFromEnv } from '@hal/media';
import { createRuntime } from './runtime/factory';
import { PulseAudioCapture } from './audio/pulse';
import { ResendEmailSender, NullEmailSender } from './email/resend';
import { JobConsumer } from './jobs/consumer';
import { makeJoinMeetingHandler } from './jobs/handlers';
import { runMeetingSession } from './pipeline/meeting-session';
import { requireWorkspaceForUser } from './workspace';
import type { Platform } from '@hal/db';

const program = new Command();
program
  .name('hal-agent')
  .description('Hal — autonomous meeting agent')
  .version('0.0.0');

program
  .command('join')
  .description('Join a single meeting URL and run an end-to-end session')
  .requiredOption('-u, --user <id>', "User id to attribute the meeting to")
  .requiredOption('--url <url>', 'Meeting URL')
  .option('-p, --platform <platform>', 'Platform: meet | zoom | teams', 'meet')
  .option('-m, --mode <mode>', 'Mode: listen | chat | speak', 'listen')
  .option('--title <title>', 'Optional meeting title for the summary email')
  .action(async (opts: { user: string; url: string; platform: string; mode: string; title?: string }) => {
    const cfg = loadConfig();
    const log = createLogger({ level: cfg.logLevel, context: { cmd: 'join' } });

    const dbHandle = createDb({ url: cfg.databaseUrl });
    await dbHandle.ping();
    const repos = makeRepositories(dbHandle.db);

    const kms = createKmsFromEnv();
    await kms.initialize();
    const envelope = createEnvelopeService(kms);

    const stt = createSttFromEnv();
    const llm = createLlmFromEnv();

    const user = await repos.users.findById(opts.user);
    if (!user) {
      log.fatal({ userId: opts.user }, 'user not found');
      process.exit(1);
    }

    // Make a new meeting row (or could be passed in via --meeting flag).
    const workspace = await requireWorkspaceForUser(repos, envelope, user);

    const meeting = await repos.meetings.create({
      workspaceId: workspace.id,
      userId: user.id,
      platform: opts.platform,
      externalUrl: opts.url,
      title: opts.title,
      policy: 'auto',
      mode: opts.mode,
      status: 'scheduled',
    });

    const runtime = createRuntime(opts.platform as Platform);
    const audio = new PulseAudioCapture(
      { sink: cfg.pulseSink, sampleRate: 16000, channels: 1 },
      log,
    );

    const email = cfg.resendApiKey ? new ResendEmailSender({ apiKey: cfg.resendApiKey }) : new NullEmailSender();

    try {
      const result = await runMeetingSession(
        {
          runtime,
          audio,
          stt,
          llm,
          envelope,
          repos,
          email,
          fromEmail: cfg.fromEmail,
          log,
        },
        {
          workspaceId: workspace.id,
          userId: user.id,
          userEmail: user.email,
          userDisplayName: user.name ?? user.email.split('@')[0]!,
          userWrappedDek: user.dekWrapped,
          userKeyId: user.dekKmsKeyId,
          meetingId: meeting.id,
          meetingUrl: opts.url,
          meetingTitle: opts.title,
          mode: opts.mode as 'listen' | 'chat' | 'speak',
          disclosure: cfg.botDisclosure.replace('{{user}}', user.name ?? user.email.split('@')[0]!),
          botDisplayName: renderBotName(cfg.botDisplayName, user.name ?? user.email.split('@')[0]!),
        },
      );
      log.info(
        {
          transcriptId: result.transcriptId,
          emailId: result.emailId,
          endedReason: result.endedReason,
          summaryOverview: result.summary.overview,
        },
        'meeting session complete',
      );
    } catch (e) {
      log.fatal({ err: (e as Error).message }, 'meeting session failed');
      process.exit(1);
    } finally {
      await dbHandle.close();
    }
  });

program
  .command('worker')
  .description('Run as a long-lived job consumer (polls Postgres jobs table)')
  .option('--concurrency <n>', 'Max concurrent jobs', '1')
  .action(async (opts: { concurrency: string }) => {
    const cfg = loadConfig();
    const log = createLogger({ level: cfg.logLevel, context: { cmd: 'worker' } });

    const dbHandle = createDb({ url: cfg.databaseUrl });
    await dbHandle.ping();
    const repos = makeRepositories(dbHandle.db);

    const kms = createKmsFromEnv();
    await kms.initialize();
    const envelope = createEnvelopeService(kms);
    const stt = createSttFromEnv();
    const llm = createLlmFromEnv();
    const email = cfg.resendApiKey ? new ResendEmailSender({ apiKey: cfg.resendApiKey }) : new NullEmailSender();

    // One PulseAudio capture per job is allocated lazily inside resolveRuntime.
    const resolveRuntime = (platform: 'meet' | 'zoom' | 'teams') => {
      const runtime = createRuntime(platform);
      const audio = new PulseAudioCapture(
        { sink: cfg.pulseSink, sampleRate: 16000, channels: 1 },
        log,
      );
      return { runtime, audio };
    };

    const handler = makeJoinMeetingHandler({
      repos,
      envelope,
      kms,
      stt,
      llm,
      email,
      fromEmail: cfg.fromEmail,
      log,
      resolveRuntime,
      botDisplayName: cfg.botDisplayName,
      botDisclosure: cfg.botDisclosure,
    });

    const consumer = new JobConsumer({
      repos,
      handlers: { join_meeting: handler },
      log,
      workerId: cfg.agentId ?? `${hostname()}-${process.pid}`,
      concurrency: Number(opts.concurrency),
    });

    consumer.start();
    log.info('hal-agent worker running. Ctrl-C to stop.');

    const shutdown = async (signal: string) => {
      log.info({ signal }, 'shutdown signal received');
      await consumer.stop();
      await dbHandle.close();
      process.exit(0);
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
