import { MailCheck, Sparkles } from "lucide-react";

import { UserButton } from "@/components/app/UserButton";
import { TriageDashboard } from "@/components/triage/TriageDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);

  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-6 text-slate-950 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2 font-black tracking-tight">
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white">
            🐼
          </span>
          <span>TriageOS</span>
        </div>
        <UserButton profile={profile} />
      </nav>

      <section className="mx-auto max-w-7xl py-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="rounded-full bg-emerald-100 px-4 py-1.5 text-emerald-800 hover:bg-emerald-100">
              <Sparkles className="mr-1.5 size-3.5" /> Real Gmail command center
            </Badge>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">
              Welcome, {profile.fullName ?? profile.email.split("@")[0]}.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Pull Gmail through Corsair, turn messages into workflow cards, and
              prepare the next AI triage layer without building a Gmail clone.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-slate-300 bg-white/70 px-5"
          >
            <a href="/onboarding">
              <MailCheck className="mr-2 size-4" /> Manage Corsair connection
            </a>
          </Button>
        </div>

        <div className="mt-10">
          <TriageDashboard
            initialItems={items.map((item) => ({
              id: item.id,
              fromEmail: item.fromEmail,
              subject: item.subject,
              snippet: item.snippet,
              bodyPreview: item.bodyPreview,
              receivedAt: item.receivedAt.toISOString(),
              workflowType: item.workflowType,
              recommendedAction: item.recommendedAction,
              priorityLabel: item.priorityLabel,
              priorityScore: item.priorityScore,
              summary: item.summary,
              status: item.status,
              intentTimeline: Array.isArray(item.intentTimeline)
                ? (item.intentTimeline as string[])
                : [],
              memoryHint: item.memoryHint,
            }))}
          />
        </div>
      </section>
    </main>
  );
}