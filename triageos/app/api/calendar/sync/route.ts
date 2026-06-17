import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fetchUpcomingCalendarEvents } from "@/lib/corsair/calendar-sync";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

const syncCalendarSchema = z.object({
  maxResults: z.number().int().min(1).max(25).default(10),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = syncCalendarSchema.parse(body);
    const connection = await getOrCreateCorsairConnection(profile.id);

    const events = await fetchUpcomingCalendarEvents({
      tenantId: connection.corsairAccountId,
      maxResults: input.maxResults,
    });

    await db
      .update(corsairConnections)
      .set({
        calendarConnected: true,
        lastCalendarSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(corsairConnections.userId, profile.id));

    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync Google Calendar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
