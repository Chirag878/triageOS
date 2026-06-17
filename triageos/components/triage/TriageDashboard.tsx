"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  MailCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TriageItem = {
  id: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  bodyPreview: string | null;
  receivedAt: string;
  workflowType: string;
  recommendedAction: string;
  priorityLabel: string;
  priorityScore: number;
  summary: string | null;
  status: string;
  intentTimeline: string[];
  memoryHint: string | null;
};

type ApiResponse = {
  items?: TriageItem[];
  imported?: number;
  error?: string;
};

export function TriageDashboard({
  initialItems,
}: {
  initialItems: TriageItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const urgent = items.filter(
      (item) => item.priorityLabel === "urgent",
    ).length;
    const meetings = items.filter(
      (item) => item.workflowType === "meeting_request",
    ).length;

    return { urgent, meetings, total: items.length };
  }, [items]);

  const syncGmail = () => {
    startTransition(async () => {
      setError(null);
      setLastImported(null);

      const response = await fetch("/api/triage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 12 }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Unable to sync Gmail messages.");
        return;
      }

      setItems(payload.items ?? []);
      setLastImported(payload.imported ?? 0);
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Inbox} label="Workflow cards" value={stats.total} />
        <StatCard
          icon={CalendarClock}
          label="Meeting asks"
          value={stats.meetings}
        />
        <StatCard icon={Sparkles} label="Urgent" value={stats.urgent} />
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <CardHeader className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <MailCheck className="mr-1 size-3" /> Gmail via Corsair
            </Badge>
            <CardTitle className="mt-3 text-3xl font-black tracking-tight">
              Triage queue
            </CardTitle>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pull recent Gmail messages into reviewable workflow cards. AI
              generation comes next; this first pass proves real data ingestion.
            </p>
          </div>
          <Button
            onClick={syncGmail}
            disabled={isPending}
            className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Sync Gmail
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {lastImported !== null ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Synced {lastImported} Gmail message{lastImported === 1 ? "" : "s"}{" "}
              into TriageOS.
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Inbox className="mx-auto size-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                No cards yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Click Sync Gmail after connecting Corsair to import your first
                real workflow cards.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <WorkflowCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
}) {
  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          <p className="text-sm text-slate-600">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowCard({ item }: { item: TriageItem }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge label={item.priorityLabel} />
            <Badge variant="outline" className="rounded-full capitalize">
              {item.workflowType.replaceAll("_", " ")}
            </Badge>
            <Badge variant="outline" className="rounded-full capitalize">
              {item.recommendedAction.replaceAll("_", " ")}
            </Badge>
          </div>
          <h3 className="mt-3 truncate text-xl font-black tracking-tight">
            {item.subject}
          </h3>
          <p className="mt-1 text-sm text-slate-500">From {item.fromEmail}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
            {item.summary ?? item.snippet ?? item.bodyPreview}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Clock3 className="size-3.5" />
          {new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(item.receivedAt))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <ol className="space-y-1 text-xs leading-5 text-slate-500">
          {(item.intentTimeline ?? []).slice(0, 3).map((step, index) => (
            <li key={`${item.id}-${step}`}>
              <span className="font-bold text-slate-900">{index + 1}.</span>{" "}
              {step}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" /> {item.status}
        </div>
      </div>
    </article>
  );
}

function PriorityBadge({ label }: { label: string }) {
  const classes =
    {
      urgent: "bg-red-100 text-red-700 hover:bg-red-100",
      high: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      normal: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      low: "bg-slate-100 text-slate-600 hover:bg-slate-100",
    }[label] ?? "bg-slate-100 text-slate-600 hover:bg-slate-100";

  return (
    <Badge className={`rounded-full capitalize ${classes}`}>{label}</Badge>
  );
}
