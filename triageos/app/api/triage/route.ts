import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export async function GET() {
  try {
    const profile = await requireUser();
    const items = await listTriageItems(profile.id);

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load triage items.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
