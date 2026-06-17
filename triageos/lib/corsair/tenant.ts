import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { getCorsairTenantId } from "@/lib/corsair/client";

export async function getOrCreateCorsairConnection(userId: string) {
  const [existing] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const tenantId = getCorsairTenantId(userId);
  const [connection] = await db
    .insert(corsairConnections)
    .values({
      userId,
      corsairAccountId: tenantId,
    })
    .onConflictDoUpdate({
      target: corsairConnections.userId,
      set: {
        corsairAccountId: tenantId,
        updatedAt: new Date(),
      },
    })
    .returning();

  return connection;
}

export async function updateCorsairConnectionStatus(input: {
  userId: string;
  gmailConnected?: boolean;
  calendarConnected?: boolean;
  gmailConnectionId?: string | null;
  calendarConnectionId?: string | null;
}) {
  const [connection] = await db
    .update(corsairConnections)
    .set({
      gmailConnected: input.gmailConnected ?? undefined,
      calendarConnected: input.calendarConnected ?? undefined,
      gmailConnectionId: input.gmailConnectionId ?? undefined,
      calendarConnectionId: input.calendarConnectionId ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(corsairConnections.userId, input.userId))
    .returning();

  return connection;
}
