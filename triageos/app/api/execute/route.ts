import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { executeTriageWorkflow } from "@/lib/actions/execute-workflow";

const calendarActionSchema = z.object({
  type: z.string().default("none"),
  title: z.string().trim().nullable().optional(),
  attendees: z.array(z.string().trim().min(1)).default([]),
  startTime: z.string().trim().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  timezone: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
});

const executeSchema = z.object({
  triageItemId: z.string().uuid(),
  draftReply: z.boolean().default(true),
  createEvent: z.boolean().default(true),
  confirmed: z.literal(true),
  suggestedReplyOverride: z.string().trim().nullable().optional(),
  calendarActionOverride: calendarActionSchema.nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = executeSchema.parse(body);
    const result = await executeTriageWorkflow({
      userId: profile.id,
      triageItemId: input.triageItemId,
      draftReply: input.draftReply,
      createEvent: input.createEvent,
      suggestedReplyOverride: input.suggestedReplyOverride,
      calendarActionOverride: input.calendarActionOverride,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Failed to execute workflow.");
  }
}
