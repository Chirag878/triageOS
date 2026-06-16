import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { actionLogs } from "./actionLog.model";
import { profiles } from "./profile.model";

export const triageItems = pgTable(
  "triage_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["gmail"] }).notNull().default("gmail"),
    externalMessageId: text("external_message_id").notNull(),
    externalThreadId: text("external_thread_id"),
    fromEmail: text("from_email").notNull(),
    toEmails: text("to_emails").array().notNull().default([]),
    ccEmails: text("cc_emails").array().notNull().default([]),
    subject: text("subject").notNull().default(""),
    snippet: text("snippet").notNull().default(""),
    bodyPreview: text("body_preview"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    workflowType: text("workflow_type", {
      enum: ["meeting_request", "needs_reply", "follow_up", "calendar_update", "fyi", "newsletter", "unknown"],
    }).notNull().default("unknown"),

    recommendedAction: text("recommended_action", {
      enum: ["schedule_and_reply", "draft_reply", "create_event", "mark_done", "review", "none"],
    }).notNull().default("review"),
    priorityLabel: text("priority_label", { enum: ["low", "normal", "high", "urgent"] })
      .notNull()
      .default("normal"),
    priorityScore: integer("priority_score").notNull().default(5),
    summary: text("summary"),
    suggestedReply: text("suggested_reply"),
    suggestedCalendarAction: jsonb("suggested_calendar_action"),
    autopilotScore: jsonb("autopilot_score"),
    intentTimeline: jsonb("intent_timeline").array().notNull().default([]),
    changeSummary: text("change_summary"),
    memoryHint: text("memory_hint"),
    externalUrl: text("external_url"),

    createdCalendarEventId: text("created_calendar_event_id"),
    sentEmailMessageId: text("sent_email_message_id"),
    draftEmailMessageId: text("draft_email_message_id"),

    aiModel: text("ai_model"),
    aiGeneratedAt: timestamp("ai_generated_at", { withTimezone: true }),
    aiOutputVersion: text("ai_output_version"),
    contentHash: text("content_hash"),

    status: text("status", { enum: ["queued", "ready", "executing", "completed", "snoozed", "failed"] })
      .notNull()
      .default("queued"),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("triage_items_user_status_received_at_idx").on(table.userId, table.status, table.receivedAt),
    index("triage_items_user_priority_label_idx").on(table.userId, table.priorityLabel),
    index("triage_items_user_workflow_type_idx").on(table.userId, table.workflowType),
    index("triage_items_priority_idx").on(table.userId, table.priorityScore),
    uniqueIndex("triage_items_user_provider_message_unique").on(
      table.userId,
      table.provider,
      table.externalMessageId,
    ),
  ],
);

export const triageItemsRelations = relations(triageItems, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [triageItems.userId],
    references: [profiles.id],
  }),
  actionLogs: many(actionLogs),
}));

export type TriageItem = typeof triageItems.$inferSelect;
export type NewTriageItem = typeof triageItems.$inferInsert;