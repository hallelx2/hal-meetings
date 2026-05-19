CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"dek_wrapped" "bytea" NOT NULL,
	"dek_kms_key_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token_ct" "bytea" NOT NULL,
	"refresh_token_ct" "bytea",
	"expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"external_url" text,
	"external_event_id" text,
	"title" text,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"policy" text DEFAULT 'ask' NOT NULL,
	"mode" text DEFAULT 'listen' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"content_ct" "bytea" NOT NULL,
	"summary_ct" "bytea",
	"duration_seconds" text,
	"speaker_count" text,
	"stt_provider" text,
	"llm_provider" text,
	"action_items_ct" "bytea",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload_ct" "bytea" NOT NULL,
	"result_ct" "bytea",
	"error_message" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"meeting_id" uuid,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "oauth_tokens_user_provider_idx" ON "oauth_tokens" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_unique_provider_account_idx" ON "oauth_tokens" USING btree ("user_id","provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "meetings_user_scheduled_idx" ON "meetings" USING btree ("user_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meetings_platform_idx" ON "meetings" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "transcripts_meeting_idx" ON "transcripts" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "transcripts_user_created_idx" ON "transcripts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_scheduled_idx" ON "jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "jobs_user_kind_idx" ON "jobs" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "jobs_kind_idx" ON "jobs" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "audit_log_user_created_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_meeting_created_idx" ON "audit_log" USING btree ("meeting_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");