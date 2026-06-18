import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app/AppShell";
import { CalendarDashboard } from "@/components/calendar/CalendarDashboard";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listCalendarEvents } from "@/lib/calendar/events";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser();
  const params = await searchParams;
  const recentlyConnected = params?.connected === "1";
  const autoConnect = params?.connect === "1";
  const events = await listCalendarEvents(profile.id);
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);

  return (
    <AppShell profile={profile} active="/calendar">
      <CalendarDashboard
        initialConnected={
          (connection?.calendarConnected ?? false) || recentlyConnected
        }
        connectionVerified={connection?.calendarConnected ?? false}
        returnTo="/calendar"
        autoConnect={autoConnect}
        initialEvents={events}
      />
    </AppShell>
  );
}
