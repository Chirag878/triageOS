import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/errors";
import { isDemoModeEnabled } from "@/config/env";
import { requireUser } from "@/lib/auth/session";
import { generateCalendarSummary } from "@/lib/ai/calendar-summary";
import { listCalendarEvents, type CalendarEventView } from "@/lib/calendar/events";
import { getDemoCalendarEvents } from "@/lib/demo/data";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export async function POST() {
  try {
    const profile = await requireUser();
    const [persistedEvents, triageItems] = await Promise.all([
      listCalendarEvents(profile.id),
      listTriageItems(profile.id),
    ]);
    const events =
      persistedEvents.length > 0
        ? persistedEvents
        : isDemoModeEnabled()
          ? getDemoCalendarEvents(8).map(toCalendarEventView)
          : [];

    const summary = await generateCalendarSummary({
      events,
      inboxSignals: triageItems.map((item) => ({
        subject: item.subject,
        fromEmail: item.fromEmail,
        priorityLabel: item.priorityLabel,
        workflowType: item.workflowType,
        recommendedAction: item.recommendedAction,
        summary: item.summary,
        suggestedReply: item.suggestedReply,
      })),
    });

    return NextResponse.json({ summary });
  } catch (error) {
    return apiErrorResponse(error, "Unable to generate AI Calendar Summary.");
  }
}

function toCalendarEventView(
  event: ReturnType<typeof getDemoCalendarEvents>[number],
): CalendarEventView {
  return {
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees: event.attendees,
    description: event.description,
    timezone: event.timezone ?? "UTC",
    location: event.location,
    status: event.status,
    externalUrl: event.htmlLink,
  };
}
