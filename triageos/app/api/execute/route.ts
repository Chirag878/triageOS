import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { executeTriageWorkflow } from "@/lib/actions/execute-workflow";

const executeSchema = z.object({
  triageItemId: z.string().uuid(),
  draftReply: z.boolean().default(true),
  createEvent: z.boolean().default(true),
  confirmed: z.literal(true),
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
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute workflow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
