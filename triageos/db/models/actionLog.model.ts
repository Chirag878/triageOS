import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profile.model";
import { triageItems } from "./triageItem.model";

export const actionLogs = pgTable(
  "action_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    triageItemId: uuid("triage_item_id").references(() => triageItems.id, { onDelete: "set null" }),
    actionType: text("action_type", {
      enum: ["create_calendar_event", "draft_email_reply", "send_email_reply", "mark_email_done", "agent_command"],
    }).notNull(),
    actionPayload: jsonb("action_payload").notNull().default({}),
    status: text("status", { enum: ["pending", "running", "succeeded", "failed", "cancelled"] })
      .notNull()
      .default("pending"),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("action_logs_user_created_at_idx").on(table.userId, table.createdAt),
    index("action_logs_triage_item_id_idx").on(table.triageItemId),
  ],
);

export const actionLogsRelations = relations(actionLogs, ({ one }) => ({
  profile: one(profiles, {
    fields: [actionLogs.userId],
    references: [profiles.id],
  }),
  triageItem: one(triageItems, {
    fields: [actionLogs.triageItemId],
    references: [triageItems.id],
  }),
}));

export type ActionLog = typeof actionLogs.$inferSelect;
export type NewActionLog = typeof actionLogs.$inferInsert;