-- transcript_segments — one row per final speech-to-text line, written while
-- the meeting is still running.
--
-- The whole-meeting `transcripts` row is unchanged and still the artifact the
-- summary is built from. This table exists so a meeting can be watched as it
-- happens, and so a worker that dies mid-call does not take the entire
-- recording with it.
--
-- Additive only: no existing table is touched, so this is safe to apply while
-- the worker is running.

CREATE TABLE IF NOT EXISTS "transcript_segments" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "meeting_id"   uuid NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,

  -- Position within the meeting, from 0. Explicit rather than inferred from
  -- created_at: two lines can land in the same millisecond, and a reader
  -- paging by timestamp would then duplicate or skip one.
  "seq"          integer NOT NULL,

  "start_ms"     integer,
  "end_ms"       integer,
  "speaker"      text,

  -- Encrypted with the workspace DEK, exactly like the whole-meeting blob.
  -- Live visibility must not become a reason to hold plaintext at rest.
  "text_ct"      bytea NOT NULL,

  "created_at"   timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- The read path: every segment for a meeting, in order.
CREATE INDEX IF NOT EXISTS "transcript_segments_meeting_seq_idx"
  ON "transcript_segments" ("meeting_id", "seq");
--> statement-breakpoint

-- A retried write must not produce a second copy of the same line. A duplicate
-- in a transcript is a quiet corruption — it reads as somebody repeating
-- themselves.
CREATE UNIQUE INDEX IF NOT EXISTS "transcript_segments_meeting_seq_unique"
  ON "transcript_segments" ("meeting_id", "seq");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "transcript_segments_workspace_idx"
  ON "transcript_segments" ("workspace_id");
