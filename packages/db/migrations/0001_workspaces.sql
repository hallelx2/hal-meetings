CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'personal' NOT NULL,
	"feature_flags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dek_wrapped" bytea NOT NULL,
	"dek_kms_key_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique_idx" ON "workspace_members" USING btree ("workspace_id","user_id");
--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "workspaces_plan_idx" ON "workspaces" USING btree ("plan");
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "_owner_user_id" uuid;
--> statement-breakpoint
INSERT INTO "workspaces" ("id", "name", "plan", "dek_wrapped", "dek_kms_key_id", "_owner_user_id")
SELECT gen_random_uuid(), COALESCE("name", "email"), 'personal', "dek_wrapped", "dek_kms_key_id", "id"
FROM "users";
--> statement-breakpoint
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT w."id", w."_owner_user_id", 'owner'
FROM "workspaces" w
WHERE w."_owner_user_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "meetings" m
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE w."_owner_user_id" = m."user_id";
--> statement-breakpoint
UPDATE "transcripts" t
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE w."_owner_user_id" = t."user_id";
--> statement-breakpoint
UPDATE "oauth_tokens" o
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE w."_owner_user_id" = o."user_id";
--> statement-breakpoint
UPDATE "jobs" j
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE j."user_id" IS NOT NULL AND w."_owner_user_id" = j."user_id";
--> statement-breakpoint
UPDATE "audit_log" a
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE a."user_id" IS NOT NULL AND w."_owner_user_id" = a."user_id";
--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "_owner_user_id";
--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transcripts" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "meetings_workspace_scheduled_idx" ON "meetings" USING btree ("workspace_id","scheduled_start");
--> statement-breakpoint
CREATE INDEX "transcripts_workspace_created_idx" ON "transcripts" USING btree ("workspace_id","created_at");
