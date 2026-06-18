import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app/AppShell";
import { GmailDashboard } from "@/components/gmail/GmailDashboard";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function GmailPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser();
  const params = await searchParams;
  const recentlyConnected = params?.connected === "1";
  const autoConnect = params?.connect === "1";
  const items = await listTriageItems(profile.id);
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);

  return (
    <AppShell profile={profile} active="/gmail">
      <GmailDashboard
        initialConnected={(connection?.gmailConnected ?? false) || recentlyConnected}
        connectionVerified={connection?.gmailConnected ?? false}
        returnTo="/gmail"
        autoConnect={autoConnect}
        initialItems={items.map((item) => ({
          id: item.id,
          fromEmail: item.fromEmail,
          toEmails: item.toEmails,
          ccEmails: item.ccEmails,
          subject: item.subject,
          snippet: item.snippet,
          bodyPreview: item.bodyPreview,
          receivedAt: item.receivedAt.toISOString(),
          workflowType: item.workflowType,
          recommendedAction: item.recommendedAction,
          priorityLabel: item.priorityLabel,
          priorityScore: item.priorityScore,
          summary: item.summary,
          suggestedReply: item.suggestedReply,
          suggestedCalendarAction: item.suggestedCalendarAction as {
            type: string;
            title: string | null;
            attendees: string[];
            startTime: string | null;
            durationMinutes: number | null;
            timezone: string | null;
            description: string | null;
          } | null,
          autopilotScore: item.autopilotScore as {
            confidence: number;
            estimatedMinutesSaved: number;
            reasoning: string;
          } | null,
          changeSummary: item.changeSummary,
          status: item.status,
          intentTimeline: Array.isArray(item.intentTimeline)
            ? (item.intentTimeline as string[])
            : [],
          memoryHint: item.memoryHint,
        }))}
      />
    </AppShell>
  );
}
