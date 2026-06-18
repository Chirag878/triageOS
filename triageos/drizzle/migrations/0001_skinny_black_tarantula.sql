CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'google_calendar' NOT NULL,
	"external_event_id" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"title" text DEFAULT 'Untitled event' NOT NULL,
	"description" text,
	"location" text,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"attendees" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"html_link" text,
	"source" text DEFAULT 'sync' NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_time_idx" ON "calendar_events" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE INDEX "calendar_events_user_updated_at_idx" ON "calendar_events" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_user_provider_external_unique" ON "calendar_events" USING btree ("user_id","provider","external_event_id");