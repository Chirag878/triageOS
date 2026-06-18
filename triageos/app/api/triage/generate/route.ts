import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { syncRecentGmailToTriage } from "@/lib/triage/gmail-ingestion";

const generateSchema = z.object({
  maxResults: z.number().int().min(1).max(25).optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = generateSchema.parse(body);
    const result = await syncRecentGmailToTriage({
      userId: profile.id,
      maxResults: input.maxResults,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Failed to sync Gmail.");
  }
}
