-- Existing rows were fully uploaded; new rows start as pending.
ALTER TABLE "file" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "file" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "last_event_at" timestamp with time zone;
