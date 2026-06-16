import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profile.model";

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    monthKey: text("month_key").notNull(),
    aiTriageCount: integer("ai_triage_count").notNull().default(0),
    agentCommandCount: integer("agent_command_count").notNull().default(0),
    emailAnalysisCount: integer("email_analysis_count").notNull().default(0),
    calendarActionCount: integer("calendar_action_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("usage_counters_user_id_idx").on(table.userId),
    uniqueIndex("usage_counters_user_month_unique").on(table.userId, table.monthKey),
  ],
);

export const usageCountersRelations = relations(usageCounters, ({ one }) => ({
  profile: one(profiles, {
    fields: [usageCounters.userId],
    references: [profiles.id],
  }),
}));

export type UsageCounter = typeof usageCounters.$inferSelect;
export type NewUsageCounter = typeof usageCounters.$inferInsert;