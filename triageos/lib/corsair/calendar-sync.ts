import { createCorsairClient } from "@/lib/corsair/client";
import {
  unwrapCorsairPayload,
  readString,
  isJsonRecord,
} from "@/lib/corsair/run";

type JsonRecord = Record<string, unknown>;

export type CorsairCalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendees: string[];
};

const CALENDAR_LIST_EVENT_OPERATIONS = [
  "googlecalendar.api.events.list",
  "googlecalendar.events.list",
  "googlecalendar.api.calendar.events.list",
  "googlecalendar.api.calendars.events.list",
] as const;

export async function fetchUpcomingCalendarEvents(input: {
  tenantId: string;
  maxResults?: number;
}) {
  const maxResults = Math.min(Math.max(input.maxResults ?? 10, 1), 25);
  const errors: string[] = [];

  for (const path of CALENDAR_LIST_EVENT_OPERATIONS) {
    try {
      const events = await fetchUpcomingCalendarEventsWithPath({
        tenantId: input.tenantId,
        maxResults,
        path,
      });

      return { events, operationPath: path };
    } catch (error) {
      errors.push(
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    [
      "Unable to sync Google Calendar through Corsair.",
      "Tried supported Calendar list operation paths but all failed.",
      "Make sure Google Calendar is connected in Corsair and the Calendar plugin exposes an events.list operation.",
      `Details: ${errors.join(" | ")}`,
    ].join(" "),
  );
}

async function fetchUpcomingCalendarEventsWithPath(input: {
  tenantId: string;
  maxResults: number;
  path: string;
}) {
  const corsair = createCorsairClient();
  const payload = unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: input.path,
      payload: buildListEventsPayload(input.maxResults),
    }),
  );

  return extractEventArray(payload)
    .map(normalizeCalendarEvent)
    .filter((event): event is CorsairCalendarEvent => Boolean(event))
    .slice(0, input.maxResults);
}

function buildListEventsPayload(maxResults: number) {
  const timeMin = new Date().toISOString();

  return {
    calendarId: "primary",
    calendar_id: "primary",
    maxResults,
    max_results: maxResults,
    singleEvents: true,
    single_events: true,
    orderBy: "startTime",
    order_by: "startTime",
    timeMin,
    time_min: timeMin,
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
    title:
      readString(event, "summary") ??
      readString(event, "title") ??
      "Untitled event",
    startTime: readEventTime(event.start),
    endTime: readEventTime(event.end),
    attendees: readAttendees(event.attendees),
  };
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
