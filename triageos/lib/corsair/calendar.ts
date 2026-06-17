import { createCorsairClient } from "@/lib/corsair/client";
import { unwrapCorsairPayload } from "@/lib/corsair/run";

export type CalendarEventInput = {
  tenantId: string;
  title: string;
  attendees: string[];
  startTime: string;
  durationMinutes: number;
  timezone: string;
  description?: string | null;
};

const CALENDAR_CREATE_EVENT_PATH = "googlecalendar.api.events.insert";

export async function createCalendarEvent(input: CalendarEventInput) {
  const start = new Date(input.startTime);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const corsair = createCorsairClient();

  return unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: CALENDAR_CREATE_EVENT_PATH,
      payload: {
        calendarId: "primary",
        requestBody: {
          summary: input.title,
          description: input.description ?? undefined,
          start: {
            dateTime: start.toISOString(),
            timeZone: input.timezone,
          },
          end: {
            dateTime: end.toISOString(),
            timeZone: input.timezone,
          },
          attendees: input.attendees.map((email) => ({ email })),
        },
      },
    }),
  );
}
