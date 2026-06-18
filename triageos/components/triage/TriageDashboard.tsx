"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Inbox,
  Loader2,
  MailCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SuggestedCalendarAction = {
  type: string;
  title: string | null;
  attendees: string[];
  startTime: string | null;
  durationMinutes: number | null;
  timezone: string | null;
  description: string | null;
} | null;

type AutopilotScore = {
  confidence: number;
  estimatedMinutesSaved: number;
  reasoning: string;
} | null;

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
  suggestedReply: string | null;
  suggestedCalendarAction: SuggestedCalendarAction;
  autopilotScore: AutopilotScore;
  changeSummary: string | null;
  status: string;
  intentTimeline: string[];
  memoryHint: string | null;
};

type ExecutionOverrides = {
  suggestedReply?: string | null;
  calendarAction?: SuggestedCalendarAction;
};

type ApiResponse = {
  items?: TriageItem[];
  item?: TriageItem;
  imported?: number;
  error?: string;
};

export function TriageDashboard({
  initialItems,
}: {
  initialItems: TriageItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.id === selectedItem?.id),
    [items, selectedItem?.id],
  );

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

  const analyzeItem = (triageItemId: string) => {
    startTransition(async () => {
      setError(null);
      setExecutionMessage(null);
      setAnalyzingId(triageItemId);

      const response = await fetch("/api/triage/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triageItemId }),
      });
      const payload = (await response.json()) as ApiResponse;

      setAnalyzingId(null);

      if (!response.ok || payload.error || !payload.item) {
        setError(payload.error ?? "Unable to generate AI workflow card.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === payload.item?.id ? payload.item : item,
        ),
      );
      setSelectedItem(payload.item);
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;

      if (event.key.toLowerCase() === "j" && items.length > 0) {
        event.preventDefault();
        const nextIndex =
          selectedIndex >= 0
            ? Math.min(selectedIndex + 1, items.length - 1)
            : 0;
        setSelectedItem(items[nextIndex]);
      }

      if (event.key.toLowerCase() === "k" && items.length > 0) {
        event.preventDefault();
        const previousIndex = selectedIndex > 0 ? selectedIndex - 1 : 0;
        setSelectedItem(items[previousIndex]);
      }

      if (event.key.toLowerCase() === "r" && selectedItem) {
        event.preventDefault();
        analyzeItem(selectedItem.id);
      }

      if (event.key.toLowerCase() === "e" && selectedItem?.suggestedReply) {
        event.preventDefault();
        executeItem(selectedItem.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, selectedItem]);

  function executeItem(triageItemId: string, overrides?: ExecutionOverrides) {
    if (
      !window.confirm(
        "Create the calendar event and Gmail draft for this workflow?",
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setExecutionMessage(null);
      setExecutingId(triageItemId);

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageItemId,
          draftReply: true,
          createEvent: true,
          confirmed: true,
          suggestedReplyOverride: overrides?.suggestedReply,
          calendarActionOverride: overrides?.calendarAction,
        }),
      });
      const payload = (await response.json()) as ApiResponse;

      setExecutingId(null);

      if (!response.ok || payload.error || !payload.item) {
        setError(payload.error ?? "Unable to execute workflow.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === payload.item?.id ? payload.item : item,
        ),
      );
      setSelectedItem(payload.item);
      setExecutionMessage(
        "Workflow executed: calendar event/draft actions were sent through Corsair.",
      );
    });
  }

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

      <div className="rounded-[2rem] border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <PlaybookStep
            step="01"
            title="Sync Gmail"
            text="Pull real messages via Corsair."
          />
          <PlaybookStep
            step="02"
            title="Pick a card"
            text="Click the email you want to understand."
          />
          <PlaybookStep
            step="03"
            title="Generate AI"
            text="Create reply, score, timeline, event."
          />
          <PlaybookStep
            step="04"
            title="Approve"
            text="Create Gmail draft and Calendar event."
          />
        </div>
      </div>

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
              Open a card to see the email detail, generate a suggested reply,
              and review meeting actions before execution.
            </p>
          </div>
          <Button
            onClick={syncGmail}
            disabled={isPending}
            className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
          >
            {isPending && !analyzingId ? (
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
          {executionMessage ? (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              {executionMessage}
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
                <WorkflowCard
                  key={item.id}
                  item={item}
                  isAnalyzing={analyzingId === item.id}
                  onAnalyze={() => analyzeItem(item.id)}
                  onOpen={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WorkflowDetailDialog
        item={selectedItem}
        isAnalyzing={Boolean(selectedItem && analyzingId === selectedItem.id)}
        isExecuting={Boolean(selectedItem && executingId === selectedItem.id)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        onAnalyze={() => {
          if (selectedItem) analyzeItem(selectedItem.id);
        }}
        onExecute={(overrides) => {
          if (selectedItem) executeItem(selectedItem.id, overrides);
        }}
      />
    </div>
  );
}

function PlaybookStep({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/80 bg-white/70 p-4 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
        {step}
      </p>
      <h3 className="mt-2 font-black tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
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

function WorkflowCard({
  item,
  isAnalyzing,
  onAnalyze,
  onOpen,
}: {
  item: TriageItem;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge label={item.priorityLabel} />
            <Badge variant="outline" className="rounded-full capitalize">
              {item.workflowType.replaceAll("_", " ")}
            </Badge>
            <Badge variant="outline" className="rounded-full capitalize">
              {item.recommendedAction.replaceAll("_", " ")}
            </Badge>
            <AIStatusBadge item={item} />
          </div>
          <h3 className="mt-3 truncate text-xl font-black tracking-tight">
            {item.subject}
          </h3>
          <p className="mt-1 text-sm text-slate-500">From {item.fromEmail}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
            {item.summary ?? item.snippet ?? item.bodyPreview}
          </p>
        </button>
        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Clock3 className="size-3.5" />
            {formatDate(item.receivedAt)}
          </div>
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Bot className="mr-2 size-4" />
            )}
            {item.suggestedReply ? "Regenerate AI" : "Generate AI"}
          </Button>
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

function WorkflowDetailDialog({
  item,
  isAnalyzing,
  isExecuting,
  onOpenChange,
  onAnalyze,
  onExecute,
}: {
  item: TriageItem | null;
  isAnalyzing: boolean;
  isExecuting: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: () => void;
  onExecute: (overrides?: ExecutionOverrides) => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 sm:max-w-3xl">
        {item ? (
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {item.subject}
              </DialogTitle>
              <DialogDescription>
                From {item.fromEmail} · {formatDate(item.receivedAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <PriorityBadge label={item.priorityLabel} />
              <Badge variant="outline" className="rounded-full capitalize">
                {item.workflowType.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline" className="rounded-full capitalize">
                {item.recommendedAction.replaceAll("_", " ")}
              </Badge>
            </div>

            <section className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Email detail
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {item.bodyPreview ?? item.snippet}
              </p>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    AI workflow card
                  </p>
                  <p className="mt-1 text-sm text-emerald-900">
                    Generate a suggested reply and calendar action, then execute
                    only after explicit confirmation.
                  </p>
                </div>
                <Button
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  {item.suggestedReply ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </section>

            {item.suggestedReply ? (
              <WorkflowExecutionReview
                key={item.id}
                item={item}
                isAnalyzing={isAnalyzing}
                isExecuting={isExecuting}
                onExecute={onExecute}
              />
            ) : null}

            {item.intentTimeline.length > 0 ? (
              <section>
                <h3 className="font-black tracking-tight">Intent timeline</h3>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {item.intentTimeline.map((step, index) => (
                    <li key={`${item.id}-detail-${step}`}>
                      <span className="font-bold text-slate-950">
                        {index + 1}.
                      </span>{" "}
                      {step}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function WorkflowExecutionReview({
  item,
  isAnalyzing,
  isExecuting,
  onExecute,
}: {
  item: TriageItem;
  isAnalyzing: boolean;
  isExecuting: boolean;
  onExecute: (overrides?: ExecutionOverrides) => void;
}) {
  const calendarAction = item.suggestedCalendarAction;
  const [replyDraft, setReplyDraft] = useState(item.suggestedReply ?? "");
  const [calendarTitle, setCalendarTitle] = useState(
    calendarAction?.title ?? "",
  );
  const [calendarStart, setCalendarStart] = useState(
    calendarAction?.startTime ?? "",
  );
  const [calendarDuration, setCalendarDuration] = useState(
    calendarAction?.durationMinutes
      ? String(calendarAction.durationMinutes)
      : "30",
  );
  const [calendarTimezone, setCalendarTimezone] = useState(
    calendarAction?.timezone ?? "UTC",
  );
  const [calendarAttendees, setCalendarAttendees] = useState(
    calendarAction?.attendees?.join(", ") ?? "",
  );
  const [calendarDescription, setCalendarDescription] = useState(
    calendarAction?.description ?? "",
  );

  const buildCalendarOverride = (): SuggestedCalendarAction => {
    if (!calendarAction) return null;

    return {
      type: calendarAction.type || "none",
      title: calendarTitle.trim() || null,
      attendees: calendarAttendees
        .split(",")
        .map((attendee) => attendee.trim())
        .filter(Boolean),
      startTime: calendarStart.trim() || null,
      durationMinutes: Number(calendarDuration) || null,
      timezone: calendarTimezone.trim() || "UTC",
      description: calendarDescription.trim() || null,
    };
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black tracking-tight">Execute workflow</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Review and edit the reply/calendar fields below, then create a
              Gmail draft and Calendar event through Corsair.
            </p>
          </div>
          <Button
            onClick={() =>
              onExecute({
                suggestedReply: replyDraft,
                calendarAction: buildCalendarOverride(),
              })
            }
            disabled={isExecuting || isAnalyzing || item.status === "completed"}
            className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
          >
            {isExecuting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            {item.status === "completed" ? "Completed" : "Create draft + event"}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-black tracking-tight">Suggested reply</h3>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => navigator.clipboard.writeText(replyDraft)}
          >
            <Copy className="mr-2 size-3.5" /> Copy
          </Button>
        </div>
        <Textarea
          value={replyDraft}
          onChange={(event) => setReplyDraft(event.target.value)}
          className="min-h-32 bg-white"
        />
      </section>

      {calendarAction?.type && calendarAction.type !== "none" ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-black tracking-tight text-blue-950">
            Suggested calendar action
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EditableField label="Title">
              <Input
                value={calendarTitle}
                onChange={(event) => setCalendarTitle(event.target.value)}
                className="rounded-2xl bg-white"
              />
            </EditableField>
            <EditableField label="Start time (ISO)">
              <Input
                value={calendarStart}
                onChange={(event) => setCalendarStart(event.target.value)}
                className="rounded-2xl bg-white"
                placeholder="2026-06-18T15:30:00Z"
              />
            </EditableField>
            <EditableField label="Duration minutes">
              <Input
                value={calendarDuration}
                onChange={(event) => setCalendarDuration(event.target.value)}
                className="rounded-2xl bg-white"
                inputMode="numeric"
              />
            </EditableField>
            <EditableField label="Timezone">
              <Input
                value={calendarTimezone}
                onChange={(event) => setCalendarTimezone(event.target.value)}
                className="rounded-2xl bg-white"
              />
            </EditableField>
            <EditableField label="Attendees" className="md:col-span-2">
              <Input
                value={calendarAttendees}
                onChange={(event) => setCalendarAttendees(event.target.value)}
                className="rounded-2xl bg-white"
                placeholder="name@example.com, teammate@example.com"
              />
            </EditableField>
            <EditableField label="Description" className="md:col-span-2">
              <Textarea
                value={calendarDescription}
                onChange={(event) => setCalendarDescription(event.target.value)}
                className="min-h-24 rounded-2xl bg-white"
              />
            </EditableField>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EditableField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function AIStatusBadge({ item }: { item: TriageItem }) {
  if (item.status === "completed") {
    return (
      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Completed
      </Badge>
    );
  }

  if (item.autopilotScore) {
    return (
      <Badge className="rounded-full bg-purple-100 text-purple-800 hover:bg-purple-100">
        {Math.round(item.autopilotScore.confidence * 100)}% AI ready
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-100">
      Needs AI
    </Badge>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
