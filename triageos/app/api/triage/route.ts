import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export async function GET() {
  try {
    const profile = await requireUser();
    const items = await listTriageItems(profile.id);

    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load triage items.");
  }
}
