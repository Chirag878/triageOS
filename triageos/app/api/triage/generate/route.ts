import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

<<<<<<< HEAD
import { apiErrorResponse } from "@/lib/api/errors";
=======
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
>>>>>>> 73fa312b9a3e2a8003b1424132c989d573f42073
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

    await db
      .update(corsairConnections)
      .set({ gmailConnected: true, updatedAt: new Date() })
      .where(eq(corsairConnections.userId, profile.id));

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Failed to sync Gmail.");
  }
}
