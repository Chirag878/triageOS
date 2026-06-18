import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Hourglass,
  Inbox,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

type TriageItem = Awaited<ReturnType<typeof listTriageItems>>[number];
type QueueColumn = "Inbox" | "Ready" | "Waiting" | "Scheduled" | "Done";
type WorkSource = "Inbox" | "Schedule" | "AI" | "Briefing";
type ImpactLevel = "High" | "Medium" | "Low";

const columns: QueueColumn[] = [
  "Inbox",
  "Ready",
  "Waiting",
  "Scheduled",
  "Done",
];

const columnCopy: Record<QueueColumn, string> = {
  Inbox: "AI-discovered work that still needs interpretation.",
  Ready: "Approved actions are one review away.",
  Waiting: "Waiting on someone or missing context.",
  Scheduled: "Scheduled execution and meeting-driven work.",
  Done: "Closed loops and completed actions.",
};

export default async function WorkflowsPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);
  const cards = items.map(toWorkCard);
  const ready = cards.filter((card) => card.column === "Ready").length;
  const waiting = cards.filter((card) => card.column === "Waiting").length;
  const scheduled = cards.filter((card) => card.column === "Scheduled").length;
  const done = cards.filter((card) => card.column === "Done").length;

  return (
    <AppShell profile={profile} active="/workflows">
      <section className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden">
        <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge className="rounded-lg bg-slate-950 text-white hover:bg-slate-950">
                <Sparkles className="mr-1.5 size-3.5" /> Work Queue
              </Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                AI-discovered work becomes approved action here.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                TriageOS turns inbox and schedule context into a small queue of
                decisions: review, approve, schedule, or mark done.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-[#f6f7f9] p-3 sm:grid-cols-4 lg:w-[34rem]">
              <QueueMetric label="Ready" value={ready} />
              <QueueMetric label="Waiting" value={waiting} />
              <QueueMetric label="Scheduled" value={scheduled} />
              <QueueMetric label="Done" value={done} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-5">
          {columns.map((column) => {
            const columnCards = cards.filter((card) => card.column === column);
            return (
              <div
                key={column}
                className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#f6f7f9] p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-3 px-1">
                  <div>
                    <h2 className="font-black tracking-tight text-slate-950">
                      {column}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {columnCopy[column]}
                    </p>
                  </div>
                  <Badge className="rounded-lg bg-white text-slate-700 shadow-sm hover:bg-white">
                    {columnCards.length}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {columnCards.length ? (
                    columnCards.map((card) => (
                      <WorkCard key={card.id} card={card} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm leading-6 text-slate-500">
                      No {column.toLowerCase()} actions right now.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </section>
    </AppShell>
  );
}

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm shadow-slate-900/[0.03]">
      <p className="text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function WorkCard({
  card,
}: {
  card: ReturnType<typeof toWorkCard>;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <SourceBadge source={card.source} />
          <Badge className={impactClass(card.impact)}>
            {card.impact} impact
          </Badge>
        </div>

        <div>
          <h3 className="line-clamp-2 font-black tracking-tight text-slate-950">
            {card.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {card.reason}
          </p>
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-100 bg-[#f6f7f9] p-3">
          <CardLine icon={Clock3} label="Effort" value={card.effort} />
          <CardLine icon={Hourglass} label="Status" value={card.status} />
        </div>

        <Button
          asChild
          className="w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
        >
          <Link href={card.href}>
            {card.cta}
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: WorkSource }) {
  const Icon =
    source === "Schedule"
      ? CalendarClock
      : source === "AI"
        ? Sparkles
        : source === "Briefing"
          ? CheckCircle2
          : Inbox;

  return (
    <Badge className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-100">
      <Icon className="mr-1.5 size-3.5" />
      {source}
    </Badge>
  );
}

function CardLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 font-black uppercase tracking-[0.14em] text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-right font-black text-slate-700">
        {value}
      </span>
    </div>
  );
}

function toWorkCard(item: TriageItem) {
  const column = getColumn(item);
  return {
    id: item.id,
    column,
    title: getActionTitle(item),
    source: getSource(item),
    reason:
      item.summary ??
      item.changeSummary ??
      item.snippet ??
      "TriageOS discovered this work item from connected context.",
    impact: getImpact(item),
    effort: getEffort(item),
    status: formatValue(item.status),
    cta: getCta(column, item),
    href: getHref(column, item),
  };
}

function getColumn(item: TriageItem): QueueColumn {
  if (item.status === "completed") return "Done";
  if (
    item.workflowType === "meeting_request" ||
    item.recommendedAction === "schedule_and_reply"
  ) {
    return "Scheduled";
  }
  if (item.recommendedAction === "mark_done") return "Waiting";
  if (item.suggestedReply || item.suggestedCalendarAction) return "Ready";
  return "Inbox";
}

function getSource(item: TriageItem): WorkSource {
  if (item.workflowType === "meeting_request") return "Schedule";
  if (item.suggestedReply || item.suggestedCalendarAction) return "AI";
  if (item.priorityLabel === "urgent") return "Briefing";
  return "Inbox";
}

function getActionTitle(item: TriageItem) {
  const action = formatValue(item.recommendedAction);
  return action === "None" ? item.subject : `${action}: ${item.subject}`;
}

function getImpact(item: TriageItem): ImpactLevel {
  if (item.priorityLabel === "urgent" || item.priorityScore >= 8) return "High";
  if (item.priorityLabel === "high" || item.priorityScore >= 5) return "Medium";
  return "Low";
}

function getEffort(item: TriageItem) {
  if (item.workflowType === "meeting_request") return "10 min";
  if (item.suggestedReply) return "3 min";
  if (item.priorityLabel === "urgent") return "5 min";
  return "2 min";
}

function getCta(column: QueueColumn, item: TriageItem) {
  if (column === "Done") return "Review";
  if (column === "Scheduled") return "Schedule";
  if (column === "Ready") return item.suggestedReply ? "Approve" : "Review";
  if (column === "Waiting") return "Mark Done";
  return "Review";
}

function getHref(column: QueueColumn, item: TriageItem) {
  if (column === "Scheduled" || item.workflowType === "meeting_request") {
    return "/calendar";
  }
  if (column === "Ready") return "/gmail";
  if (column === "Done") return "/activity";
  return "/gmail";
}

function impactClass(impact: ImpactLevel) {
  if (impact === "High") {
    return "rounded-lg bg-red-100 text-red-800 hover:bg-red-100";
  }
  if (impact === "Medium") {
    return "rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-100";
  }
  return "rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function formatValue(value: string | null | undefined) {
  if (!value) return "None";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
