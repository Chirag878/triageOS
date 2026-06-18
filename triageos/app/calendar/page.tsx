import { AppShell } from "@/components/app/AppShell";
import { CalendarDashboard } from "@/components/calendar/CalendarDashboard";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const profile = await requireUser();

  return (
    <AppShell profile={profile} active="/calendar">
      <CalendarDashboard />
    </AppShell>
  );
}
