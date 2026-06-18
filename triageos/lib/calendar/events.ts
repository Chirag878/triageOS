import { randomUUID } from "node:crypto";

import { addMinutes } from "date-fns";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { calendarEvents } from "@/db/schema";
import type { CorsairCalendarEvent } from "@/lib/corsair/calendar-sync";
import type { CalendarEventInput } from "@/lib/corsair/calendar";
import { isJsonRecord, readString } from "@/lib/corsair/run";

type JsonRecord = Record<string, unknown>;

export type CalendarEventView = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendees: string[];
  description: string | null;
  timezone: string;
  location: string | null;
  status: string;
  externalUrl: string | null;
};

export type CalendarEventWrite = {
  userId: string;
  externalEventId: string;
  calendarId?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  timezone?: string | null;
  attendees?: string[];
  status?: string | null;
  htmlLink?: string | null;
  source?: "sync" | "manual" | "workflow" | "agent";
  raw?: JsonRecord;
  syncedAt?: Date | null;
};

export async function listCalendarEvents(userId: string) {
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, userId))
    .orderBy(asc(calendarEvents.startTime), asc(calendarEvents.title))
    .limit(100);

  return rows.map(toCalendarEventView);
}

export async function upsertCalendarEvents(
  userId: string,
  events: CorsairCalendarEvent[],
) {
  if (events.length === 0) {
    return listCalendarEvents(userId);
  }

  const now = new Date();

  await db
    .insert(calendarEvents)
    .values(
      events.map((event) =>
        toInsertValue({
          userId,
          externalEventId: event.id,
          calendarId: event.calendarId,
          title: event.title,
          description: event.description,
          location: event.location,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          attendees: event.attendees,
          status: event.status,
          htmlLink: event.htmlLink,
          source: "sync",
          raw: event.raw,
          syncedAt: now,
        }),
      ),
    )
    .onConflictDoUpdate({
      target: [
        calendarEvents.userId,
        calendarEvents.provider,
        calendarEvents.externalEventId,
      ],
      set: {
        calendarId: sql`excluded.calendar_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        location: sql`excluded.location`,
        startTime: sql`excluded.start_time`,
        endTime: sql`excluded.end_time`,
        timezone: sql`excluded.timezone`,
        attendees: sql`excluded.attendees`,
        status: sql`excluded.status`,
        htmlLink: sql`excluded.html_link`,
        source: sql`excluded.source`,
        raw: sql`excluded.raw`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: now,
      },
    });

  return listCalendarEvents(userId);
}

export async function saveCalendarEvent(input: CalendarEventWrite) {
  const [row] = await db
    .insert(calendarEvents)
    .values(toInsertValue(input))
    .onConflictDoUpdate({
      target: [
        calendarEvents.userId,
        calendarEvents.provider,
        calendarEvents.externalEventId,
      ],
      set: {
        calendarId: sql`excluded.calendar_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        location: sql`excluded.location`,
        startTime: sql`excluded.start_time`,
        endTime: sql`excluded.end_time`,
        timezone: sql`excluded.timezone`,
        attendees: sql`excluded.attendees`,
        status: sql`excluded.status`,
        htmlLink: sql`excluded.html_link`,
        source: sql`excluded.source`,
        raw: sql`excluded.raw`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return toCalendarEventView(row);
}

export function calendarEventWriteFromCreateResult(input: {
  userId: string;
  source: CalendarEventWrite["source"];
  calendarInput: CalendarEventInput;
  result: JsonRecord;
}): CalendarEventWrite {
  const start = new Date(input.calendarInput.startTime);
  const end = addMinutes(start, input.calendarInput.durationMinutes);
  const resultEvent = readNestedEvent(input.result);
  const externalEventId =
    readString(resultEvent, "id") ??
    readString(resultEvent, "eventId") ??
    readString(input.result, "id") ??
    `local-${randomUUID()}`;

  return {
    userId: input.userId,
    externalEventId,
    calendarId: readString(resultEvent, "calendarId") ?? "primary",
    title:
      readString(resultEvent, "summary") ??
      readString(resultEvent, "title") ??
      input.calendarInput.title,
    description:
      readString(resultEvent, "description") ??
      input.calendarInput.description ??
      null,
    location: readString(resultEvent, "location"),
    startTime: readEventTime(resultEvent.start) ?? start,
    endTime: readEventTime(resultEvent.end) ?? end,
    timezone: input.calendarInput.timezone,
    attendees: readAttendees(resultEvent.attendees).length
      ? readAttendees(resultEvent.attendees)
      : input.calendarInput.attendees,
    status: readString(resultEvent, "status") ?? "confirmed",
    htmlLink: readString(resultEvent, "htmlLink"),
    source: input.source,
    raw: input.result,
    syncedAt: new Date(),
  };
}

function toInsertValue(input: CalendarEventWrite) {
  return {
    userId: input.userId,
    provider: "google_calendar" as const,
    externalEventId: input.externalEventId,
    calendarId: input.calendarId ?? "primary",
    title: input.title || "Untitled event",
    description: input.description ?? null,
    location: input.location ?? null,
    startTime: toDate(input.startTime),
    endTime: toDate(input.endTime),
    timezone: input.timezone || "UTC",
    attendees: input.attendees ?? [],
    status: input.status || "confirmed",
    htmlLink: input.htmlLink ?? null,
    source: input.source ?? "sync",
    raw: input.raw ?? {},
    syncedAt: input.syncedAt ?? new Date(),
    updatedAt: new Date(),
  };
}

function toCalendarEventView(
  row: typeof calendarEvents.$inferSelect,
): CalendarEventView {
  return {
    id: row.externalEventId,
    title: row.title,
    startTime: row.startTime?.toISOString() ?? null,
    endTime: row.endTime?.toISOString() ?? null,
    attendees: row.attendees,
    description: row.description,
    timezone: row.timezone,
    location: row.location,
    status: row.status,
    externalUrl: row.htmlLink,
  };
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readNestedEvent(result: JsonRecord) {
  const candidates = [result.event, result.data, result.result];
  for (const candidate of candidates) {
    if (isJsonRecord(candidate)) return candidate;
  }

  return result;
}

function readEventTime(value: unknown) {
  if (!isJsonRecord(value)) return null;
  return readString(value, "dateTime") ?? readString(value, "date");
}

function readAttendees(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isJsonRecord)
    .map((attendee) => readString(attendee, "email"))
    .filter((email): email is string => Boolean(email));
}
