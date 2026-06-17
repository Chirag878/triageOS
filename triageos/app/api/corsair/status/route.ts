import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { CorsairError, createCorsairClient } from "@/lib/corsair/client";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

export async function GET() {
  try {
    const profile = await requireUser();
    const connection = await getOrCreateCorsairConnection(profile.id);

    let remoteStatus: unknown = null;

    try {
      remoteStatus = await createCorsairClient().getTenantStatus(
        connection.corsairAccountId,
      );
    } catch (error) {
      if (!(error instanceof CorsairError)) {
        throw error;
      }
    }

    const [freshConnection] = await db
      .select()
      .from(corsairConnections)
      .where(eq(corsairConnections.userId, profile.id))
      .limit(1);

    return NextResponse.json({
      tenantId: connection.corsairAccountId,
      gmailConnected: freshConnection?.gmailConnected ?? false,
      calendarConnected: freshConnection?.calendarConnected ?? false,
      gmailConnectionId: freshConnection?.gmailConnectionId ?? null,
      calendarConnectionId: freshConnection?.calendarConnectionId ?? null,
      remoteStatus,
    });
  } catch (error) {
    const status = error instanceof CorsairError ? 502 : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load Corsair status.";

    return NextResponse.json({ error: message }, { status });
  }
}
