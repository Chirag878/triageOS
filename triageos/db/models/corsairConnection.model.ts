import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profile.model";

export const corsairConnections = pgTable(
  "corsair_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" })
      .unique(),
    corsairAccountId: text("corsair_account_id").notNull().unique(),
    gmailConnectionId: text("gmail_connection_id"),
    calendarConnectionId: text("calendar_connection_id"),
    gmailConnected: boolean("gmail_connected").notNull().default(false),
    calendarConnected: boolean("calendar_connected").notNull().default(false),
    lastGmailSyncAt: timestamp("last_gmail_sync_at", { withTimezone: true }),
    lastCalendarSyncAt: timestamp("last_calendar_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("corsair_connections_user_id_idx").on(table.userId)],
);

export const corsairConnectionsRelations = relations(corsairConnections, ({ one }) => ({
  profile: one(profiles, {
    fields: [corsairConnections.userId],
    references: [profiles.id],
  }),
}));

export type CorsairConnection = typeof corsairConnections.$inferSelect;
export type NewCorsairConnection = typeof corsairConnections.$inferInsert;