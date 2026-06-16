import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { actionLogs } from "./actionLog.model";
import { corsairConnections } from "./corsairConnection.model";
import { triageItems } from "./triageItem.model";
import { usageCounters } from "./usageCounter.model";
import { userPreferences } from "./userPreference.model";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  plan: text("plan", { enum: ["starter", "pilot", "autopilot"] }).notNull().default("starter"),
  planSource: text("plan_source", {
    enum: ["free", "manual", "stripe", "promo", "hackathon"],
  })
    .notNull()
    .default("free"),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  corsairConnection: one(corsairConnections),
  preferences: one(userPreferences),
  usageCounters: many(usageCounters),
  triageItems: many(triageItems),
  actionLogs: many(actionLogs),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;