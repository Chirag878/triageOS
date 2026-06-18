import { isDemoModeEnabled } from "@/config/env";
import { createCorsairClient } from "@/lib/corsair/client";
import {
  unwrapCorsairPayload,
  readString,
  isJsonRecord,
} from "@/lib/corsair/run";
import { getDemoCalendarEvents } from "@/lib/demo/data";

type JsonRecord = Record<string, unknown>;

export type CorsairCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  attendees: string[];
  status: string;
  htmlLink: string | null;
  raw: JsonRecord;
};

const CALENDAR_LIST_EVENTS_PATH = "googlecalendar.api.events.getMany";

export async function fetchUpcomingCalendarEvents(input: {
  tenantId: string;
  maxResults?: number;
}) {
  const maxResults = Math.min(Math.max(input.maxResults ?? 10, 1), 25);
  if (isDemoModeEnabled()) {
    return {
      events: getDemoCalendarEvents(maxResults),
      operationPath: `${CALENDAR_LIST_EVENTS_PATH}:demo`,
    };
  }

  const corsair = createCorsairClient();
  const payload = unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: CALENDAR_LIST_EVENTS_PATH,
      payload: buildListEventsPayload(maxResults),
    }),
  );

  const events = extractEventArray(payload)
    .map(normalizeCalendarEvent)
    .filter((event): event is CorsairCalendarEvent => Boolean(event))
    .slice(0, maxResults);

  return { events, operationPath: CALENDAR_LIST_EVENTS_PATH };
}

function buildListEventsPayload(maxResults: number) {
  return {
    calendarId: "primary",
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
  };
}

function extractEventArray(payload: JsonRecord) {
  const candidates = [
    payload.items,
    payload.events,
    payload.data,
    payload.value,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isJsonRecord);
  }

  if (payload.event && isJsonRecord(payload.event)) return [payload.event];
  return [];
}

function normalizeCalendarEvent(
  event: JsonRecord,
): CorsairCalendarEvent | null {
  const id = readString(event, "id") ?? readString(event, "eventId");
  if (!id) return null;

  return {
    id,
    calendarId: readString(event, "calendarId") ?? "primary",
    title:
      readString(event, "summary") ??
      readString(event, "title") ??
      "Untitled event",
    description: readString(event, "description"),
    location: readString(event, "location"),
    startTime: readEventTime(event.start),
    endTime: readEventTime(event.end),
    timezone: readEventTimezone(event.start) ?? readEventTimezone(event.end),
    attendees: readAttendees(event.attendees),
    status: readString(event, "status") ?? "confirmed",
    htmlLink: readString(event, "htmlLink"),
    raw: event,
  };
}

function readEventTime(value: unknown) {
  if (!isJsonRecord(value)) return null;
  return readString(value, "dateTime") ?? readString(value, "date");
}

function readEventTimezone(value: unknown) {
  if (!isJsonRecord(value)) return null;
  return readString(value, "timeZone");
}

function readAttendees(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isJsonRecord)
    .map((attendee) => readString(attendee, "email"))
    .filter((email): email is string => Boolean(email));
}
