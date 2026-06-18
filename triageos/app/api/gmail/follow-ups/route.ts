import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { detectFollowUps } from "@/lib/ai/follow-up-detection";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export async function POST() {
  try {
    const profile = await requireUser();
    const triageItems = await listTriageItems(profile.id);
    const detection = await detectFollowUps({
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

    return NextResponse.json({ detection });
  } catch (error) {
    return apiErrorResponse(error, "Unable to detect follow-ups.");
  }
}
