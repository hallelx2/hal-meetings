import { and, eq } from 'drizzle-orm';
import type { Db } from '../client';
import {
  oauthTokens,
  type OauthTokenRow,
  type NewOauthTokenRow,
} from '../schema/oauth-tokens';
import type { OauthProvider } from '../types';

export class OauthTokensRepository {
  constructor(private readonly db: Db) {}

  async findForUser(
    userId: string,
    provider: OauthProvider,
  ): Promise<OauthTokenRow[]> {
    return this.db
      .select()
      .from(oauthTokens)
      .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)));
  }

  async findByProviderAccount(
    userId: string,
    provider: OauthProvider,
    providerAccountId: string,
  ): Promise<OauthTokenRow | null> {
    const rows = await this.db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider),
          eq(oauthTokens.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Upsert by (user, provider, provider_account_id). Used when refreshing an
   * access token or re-connecting an OAuth provider.
   */
  async upsert(input: NewOauthTokenRow): Promise<OauthTokenRow> {
    const [row] = await this.db
      .insert(oauthTokens)
      .values(input)
      .onConflictDoUpdate({
        target: [
          oauthTokens.userId,
          oauthTokens.provider,
          oauthTokens.providerAccountId,
        ],
        set: {
          accessTokenCt: input.accessTokenCt,
          refreshTokenCt: input.refreshTokenCt,
          expiresAt: input.expiresAt,
          scopes: input.scopes,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('[@hal/db] oauth token upsert returned no row');
    return row;
  }

  async deleteForUserProvider(
    userId: string,
    provider: OauthProvider,
  ): Promise<void> {
    await this.db
      .delete(oauthTokens)
      .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)));
  }
}
