import { AppShell } from "@/components/app/AppShell";
import { AiWorkflowDashboard } from "@/components/ai/AiWorkflowDashboard";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);

  return (
    <AppShell profile={profile} active="/ai">
      <AiWorkflowDashboard
        initialItems={items.map((item) => ({
          id: item.id,
          fromEmail: item.fromEmail,
          subject: item.subject,
          summary: item.summary,
          snippet: item.snippet,
          suggestedReply: item.suggestedReply,
          workflowType: item.workflowType,
          priorityLabel: item.priorityLabel,
          status: item.status,
        }))}
      />
    </AppShell>
  );
}
