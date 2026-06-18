import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profile.model";

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google_calendar"] })
      .notNull()
      .default("google_calendar"),
    externalEventId: text("external_event_id").notNull(),
    calendarId: text("calendar_id").notNull().default("primary"),
    title: text("title").notNull().default("Untitled event"),
    description: text("description"),
    location: text("location"),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    timezone: text("timezone").notNull().default("UTC"),
    attendees: text("attendees").array().notNull().default([]),
    status: text("status").notNull().default("confirmed"),
    htmlLink: text("html_link"),
    source: text("source").notNull().default("sync"),
    raw: jsonb("raw").notNull().default({}),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("calendar_events_user_start_time_idx").on(
      table.userId,
      table.startTime,
    ),
    index("calendar_events_user_updated_at_idx").on(
      table.userId,
      table.updatedAt,
    ),
    uniqueIndex("calendar_events_user_provider_external_unique").on(
      table.userId,
      table.provider,
      table.externalEventId,
    ),
  ],
);

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  profile: one(profiles, {
    fields: [calendarEvents.userId],
    references: [profiles.id],
  }),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
