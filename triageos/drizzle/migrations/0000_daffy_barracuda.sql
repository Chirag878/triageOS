CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'starter' NOT NULL,
	"plan_source" text DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "corsair_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"corsair_account_id" text NOT NULL,
	"gmail_connection_id" text,
	"calendar_connection_id" text,
	"gmail_connected" boolean DEFAULT false NOT NULL,
	"calendar_connected" boolean DEFAULT false NOT NULL,
	"last_gmail_sync_at" timestamp with time zone,
	"last_calendar_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corsair_connections_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "corsair_connections_corsair_account_id_unique" UNIQUE("corsair_account_id")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month_key" text NOT NULL,
	"ai_triage_count" integer DEFAULT 0 NOT NULL,
	"agent_command_count" integer DEFAULT 0 NOT NULL,
	"email_analysis_count" integer DEFAULT 0 NOT NULL,
	"calendar_action_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_reply_tone" text DEFAULT 'concise friendly' NOT NULL,
	"preferred_meeting_duration" integer DEFAULT 30 NOT NULL,
	"preferred_meeting_time" text DEFAULT 'morning' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"external_message_id" text NOT NULL,
	"external_thread_id" text,
	"from_email" text NOT NULL,
	"to_emails" text[] DEFAULT '{}' NOT NULL,
	"cc_emails" text[] DEFAULT '{}' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"body_preview" text,
	"received_at" timestamp with time zone NOT NULL,
	"workflow_type" text DEFAULT 'unknown' NOT NULL,
	"recommended_action" text DEFAULT 'review' NOT NULL,
	"priority_label" text DEFAULT 'normal' NOT NULL,
	"priority_score" integer DEFAULT 5 NOT NULL,
	"summary" text,
	"suggested_reply" text,
	"suggested_calendar_action" jsonb,
	"autopilot_score" jsonb,
	"intent_timeline" jsonb[] DEFAULT '{}' NOT NULL,
	"change_summary" text,
	"memory_hint" text,
	"external_url" text,
	"created_calendar_event_id" text,
	"sent_email_message_id" text,
	"draft_email_message_id" text,
	"ai_model" text,
	"ai_generated_at" timestamp with time zone,
	"ai_output_version" text,
	"content_hash" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"executed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"triage_item_id" uuid,
	"action_type" text NOT NULL,
	"action_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corsair_connections" ADD CONSTRAINT "corsair_connections_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_items" ADD CONSTRAINT "triage_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_triage_item_id_triage_items_id_fk" FOREIGN KEY ("triage_item_id") REFERENCES "public"."triage_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corsair_connections_user_id_idx" ON "corsair_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_counters_user_id_idx" ON "usage_counters" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_user_month_unique" ON "usage_counters" USING btree ("user_id","month_key");--> statement-breakpoint
CREATE INDEX "triage_items_user_status_received_at_idx" ON "triage_items" USING btree ("user_id","status","received_at");--> statement-breakpoint
CREATE INDEX "triage_items_user_priority_label_idx" ON "triage_items" USING btree ("user_id","priority_label");--> statement-breakpoint
CREATE INDEX "triage_items_user_workflow_type_idx" ON "triage_items" USING btree ("user_id","workflow_type");--> statement-breakpoint
CREATE INDEX "triage_items_priority_idx" ON "triage_items" USING btree ("user_id","priority_score");--> statement-breakpoint
CREATE UNIQUE INDEX "triage_items_user_provider_message_unique" ON "triage_items" USING btree ("user_id","provider","external_message_id");--> statement-breakpoint
CREATE INDEX "action_logs_user_created_at_idx" ON "action_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "action_logs_triage_item_id_idx" ON "action_logs" USING btree ("triage_item_id");