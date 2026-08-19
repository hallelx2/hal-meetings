import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users, bytea } from './users';
import { workspaces } from './workspaces';

/**
 * OAuth tokens — the crown jewels. Every value here is ciphertext. We store
 * the refresh token (long-lived) and the most recent access token, both
 * encrypted with the user's DEK.
 */
export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    provider: text('provider').notNull(), // 'google' | 'microsoft' | 'zoom'
    providerAccountId: text('provider_account_id').notNull(), // remote user id

    accessTokenCt: bytea('access_token_ct').notNull(),
    refreshTokenCt: bytea('refresh_token_ct'),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    scopes: text('scopes').array().notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderIdx: index('oauth_tokens_user_provider_idx').on(table.userId, table.provider),
    // One row per (user, provider, remote-account) — prevents double-link.
    uniqueProviderAccount: uniqueIndex('oauth_tokens_unique_provider_account_idx').on(
      table.userId,
      table.provider,
      table.providerAccountId,
    ),
  }),
);

export type OauthTokenRow = typeof oauthTokens.$inferSelect;
export type NewOauthTokenRow = typeof oauthTokens.$inferInsert;
