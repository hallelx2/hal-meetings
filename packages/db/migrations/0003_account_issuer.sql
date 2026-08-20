-- Better Auth >= 1.7 keys an OAuth identity on (issuer, accountId) rather than
-- (providerId, accountId), and declares `issuer` as a required field on the
-- account model. Without the column the Drizzle adapter resolves it to
-- undefined and emits `where ( = $1 and "auth_account"."account_id" = $2)`,
-- which Postgres rejects with 42601. Every Google sign-in failed on it.
--
-- Backfill follows Better Auth's 1-7 upgrade contract:
--   OIDC providers      -> the provider's exact trusted issuer URL
--   OAuth, no issuer    -> local:oauth:<percent-encoded providerId>
--   credential          -> local:credential, account_id = the user's local id
-- The percent-encoding and the credential account_id rule are both load-bearing:
-- a synthetic issuer built by plain concatenation collides for provider ids
-- containing reserved characters, and credential rows keyed on anything but the
-- user id will not match at sign-in.

ALTER TABLE "auth_account" ADD COLUMN "issuer" text;
--> statement-breakpoint

-- encodeURIComponent, in SQL. Better Auth builds synthetic issuers with it
-- (encodeAccountIssuerProviderId), so `team/github` must become
-- `team%2Fgithub`, not `team/github`. Created in pg_temp: session-scoped, and
-- dropped automatically, so the migration leaves no function behind.
CREATE FUNCTION pg_temp.uri_encode(input text) RETURNS text AS $encode$
DECLARE
  out text := '';
  ch text;
  i int;
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;
  FOR i IN 1..length(input) LOOP
    ch := substr(input, i, 1);
    IF ch ~ '[A-Za-z0-9\-_.!~*''()]' THEN
      out := out || ch;
    ELSE
      out := out || upper(
        regexp_replace(encode(convert_to(ch, 'UTF8'), 'hex'), '(..)', E'%\\1', 'g')
      );
    END IF;
  END LOOP;
  RETURN out;
END;
$encode$ LANGUAGE plpgsql IMMUTABLE;
--> statement-breakpoint

-- Credential accounts are keyed on the user's local id, not on whatever the
-- row happened to carry.
UPDATE "auth_account" a
SET "issuer" = 'local:credential',
    "account_id" = u."id"
FROM "auth_user" u
WHERE a."user_id" = u."id"
  AND a."provider_id" = 'credential'
  AND a."issuer" IS NULL;
--> statement-breakpoint

UPDATE "auth_account"
SET "issuer" = CASE "provider_id"
  WHEN 'google' THEN 'https://accounts.google.com'
  ELSE 'local:oauth:' || pg_temp.uri_encode("provider_id")
END
WHERE "issuer" IS NULL;
--> statement-breakpoint

ALTER TABLE "auth_account" ALTER COLUMN "issuer" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX "auth_account_issuer_account_idx" ON "auth_account" USING btree ("issuer","account_id");
