import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

const ALLOWED_NEXT_PATHS = new Set([
  "/briefing",
  "/dashboard",
  "/gmail",
  "/calendar",
  "/onboarding",
  "/settings",
]);

export async function GET(request: NextRequest) {
  const profile = await requireUser();
  await getOrCreateCorsairConnection(profile.id);

  await db
    .update(corsairConnections)
    .set({
      gmailConnected: true,
      calendarConnected: true,
      updatedAt: new Date(),
    })
    .where(eq(corsairConnections.userId, profile.id));

  const requestedNext =
    request.nextUrl.searchParams.get("next") ?? "/briefing";
  const nextPath = ALLOWED_NEXT_PATHS.has(requestedNext)
    ? requestedNext === "/dashboard"
      ? "/briefing"
      : requestedNext
    : "/briefing";
  const redirectUrl = new URL(nextPath, request.nextUrl.origin);
  redirectUrl.searchParams.set("connected", "1");

  return NextResponse.redirect(redirectUrl);
}
