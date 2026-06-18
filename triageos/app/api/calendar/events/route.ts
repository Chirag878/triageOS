import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createCalendarEvent } from "@/lib/corsair/calendar";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  startTime: z.string().trim().min(1, "Start time is required."),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(30),
  timezone: z.string().trim().min(1).default("UTC"),
  attendees: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().nullable().optional(),
  reminderMinutes: z
    .number()
    .int()
    .min(0)
    .max(60 * 24 * 14)
    .nullable()
    .optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = createCalendarEventSchema.parse(body);
    const connection = await getOrCreateCorsairConnection(profile.id);

    const event = await createCalendarEvent({
      tenantId: connection.corsairAccountId,
      title: input.title,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      attendees: input.attendees,
      description: input.description,
      reminderMinutes: input.reminderMinutes,
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create calendar event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
