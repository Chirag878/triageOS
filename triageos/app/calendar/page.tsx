import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app/AppShell";
import { CalendarDashboard } from "@/components/calendar/CalendarDashboard";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const profile = await requireUser();
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);

  return (
    <AppShell profile={profile} active="/calendar">
      <CalendarDashboard
        initialConnected={connection?.calendarConnected ?? false}
      />
    </AppShell>
  );
}
