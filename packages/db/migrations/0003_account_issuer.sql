-- Better Auth >= 1.7 keys an OAuth identity on (issuer, accountId) rather than
-- (providerId, accountId), and declares `issuer` as a required field on the
-- account model. Without the column the Drizzle adapter resolves it to
-- undefined and emits `where ( = $1 and "auth_account"."account_id" = $2)`,
-- which Postgres rejects with 42601. Every Google sign-in failed on it.

ALTER TABLE "auth_account" ADD COLUMN "issuer" text;
--> statement-breakpoint

-- Backfill existing rows. Providers that publish an issuer use it verbatim;
-- everything else gets the synthetic namespace Better Auth generates in
-- createOAuthAccountIssuer()/createLocalAccountIssuer().
UPDATE "auth_account"
SET "issuer" = CASE "provider_id"
  WHEN 'google' THEN 'https://accounts.google.com'
  WHEN 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "provider_id"
END
WHERE "issuer" IS NULL;
--> statement-breakpoint

ALTER TABLE "auth_account" ALTER COLUMN "issuer" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX "auth_account_issuer_account_idx" ON "auth_account" USING btree ("issuer","account_id");
