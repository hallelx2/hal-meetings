/**
 * Shared enums for the Hal data model. Mirrored on the column type side so
 * Drizzle gives us narrowed string literal types at the call site.
 */

export const WORKSPACE_PLANS = ['personal', 'team', 'hosted'] as const;
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number];

export const WORKSPACE_ROLES = ['owner', 'member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PLATFORMS = ['meet', 'zoom', 'teams'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const MEETING_POLICIES = ['auto', 'ask', 'ignore'] as const;
export type MeetingPolicy = (typeof MEETING_POLICIES)[number];

export const MEETING_MODES = ['listen', 'chat', 'speak', 'skipped'] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

export const MEETING_STATUSES = [
  'scheduled',
  'joining',
  'in-progress',
  'completed',
  'failed',
  'cancelled',
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const OAUTH_PROVIDERS = ['google', 'microsoft', 'zoom'] as const;
export type OauthProvider = (typeof OAUTH_PROVIDERS)[number];

export const JOB_KINDS = [
  'join_meeting',
  'transcribe',
  'summarize',
  'send_summary_email',
  'draft_followup',
  'crm_update',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = [
  'pending',
  'claimed',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const AUDIT_ACTIONS = [
  'user_created',
  'oauth_connected',
  'oauth_disconnected',
  'oauth_token_refreshed',
  'meeting_scheduled',
  'meeting_policy_changed',
  'bot_joined',
  'bot_disclosed',
  'bot_spoke',
  'bot_chatted',
  'bot_kicked',
  'bot_left',
  'transcript_created',
  'transcript_decrypted',
  'summary_created',
  'email_sent',
  'token_decrypted',
  'kms_dek_wrapped',
  'kms_dek_unwrapped',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
