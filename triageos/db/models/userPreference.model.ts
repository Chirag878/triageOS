import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profile.model";

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  defaultReplyTone: text("default_reply_tone").notNull().default("concise friendly"),
  preferredMeetingDuration: integer("preferred_meeting_duration").notNull().default(30),
  preferredMeetingTime: text("preferred_meeting_time").notNull().default("morning"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  profile: one(profiles, {
    fields: [userPreferences.userId],
    references: [profiles.id],
  }),
}));

