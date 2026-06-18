import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app/AppShell";
import { GmailDashboard } from "@/components/gmail/GmailDashboard";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function GmailPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);

  return (
    <AppShell profile={profile} active="/gmail">
      <GmailDashboard
        initialConnected={connection?.gmailConnected ?? false}
        initialItems={items.map((item) => ({
          id: item.id,
          fromEmail: item.fromEmail,
          subject: item.subject,
          snippet: item.snippet,
          receivedAt: item.receivedAt.toISOString(),
          status: item.status,
        }))}
      />
    </AppShell>
  );
}
