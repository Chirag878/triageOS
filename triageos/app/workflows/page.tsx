import { CheckCircle2, Clock3, Inbox, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);
  const ready = items.filter((item) => Boolean(item.suggestedReply)).length;
  const completed = items.filter((item) => item.status === "completed").length;

  return (
    <AppShell profile={profile} active="/workflows">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="rounded-full bg-purple-100 text-purple-800 hover:bg-purple-100">
              <Sparkles className="mr-1.5 size-3.5" /> Workflow map
            </Badge>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">
              Your inbox, grouped by next action.
            </h1>
            <p className="mt-4 max-w-2xl text-slate-600">
              A calmer view of what TriageOS has imported, analyzed, and
              completed.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Imported" value={items.length} icon={Inbox} />
          <Metric label="AI ready" value={ready} icon={Sparkles} />
          <Metric label="Completed" value={completed} icon={CheckCircle2} />
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="rounded-[1.5rem] border-white/70 bg-white/80 shadow-sm"
            >
              <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full capitalize"
                    >
                      {item.workflowType.replaceAll("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-black tracking-tight">
                    {item.subject}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                    {item.summary ?? item.snippet}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Clock3 className="size-4" />
                  {item.receivedAt.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
}) {
  return (
    <Card className="rounded-[1.75rem] border-white/70 bg-white/80 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
