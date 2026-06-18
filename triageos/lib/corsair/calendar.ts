import { addMinutes } from "date-fns";

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
  reminderMinutes?: number | null;
};

const CALENDAR_CREATE_EVENT_PATH = "googlecalendar.api.events.create";

export async function createCalendarEvent(input: CalendarEventInput) {
  const corsair = createCorsairClient();
  const start = new Date(input.startTime);
  const end = addMinutes(start, input.durationMinutes);

  return unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: CALENDAR_CREATE_EVENT_PATH,
      payload: {
        calendarId: "primary",
        sendUpdates: "all",
        event: {
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
          reminders:
            input.reminderMinutes !== undefined &&
            input.reminderMinutes !== null
              ? {
                  useDefault: false,
                  overrides: [
                    { method: "popup", minutes: input.reminderMinutes },
                  ],
                }
              : undefined,
        },
      },
    }),
  );
}
