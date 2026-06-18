import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { generateMeetingPrep } from "@/lib/ai/meeting-prep";
import { listCalendarEvents } from "@/lib/calendar/events";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

const meetingPrepSchema = z.object({
  eventId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = meetingPrepSchema.parse(body);
    const [events, triageItems] = await Promise.all([
      listCalendarEvents(profile.id),
      listTriageItems(profile.id),
    ]);
    const event = events.find((candidate) => candidate.id === input.eventId);

    if (!event) {
      return NextResponse.json(
        { error: "Calendar event not found for Meeting Prep AI." },
        { status: 404 },
      );
    }

    const prep = await generateMeetingPrep({
      event,
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

    return NextResponse.json({ prep });
  } catch (error) {
    return apiErrorResponse(error, "Unable to generate meeting prep.");
  }
}
