"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  MailCheck,
  PlugZap,
  RefreshCw,
  Sparkles,
  Users,
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

type GmailItem = {
  id: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  snippet: string | null;
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

type ApiResponse = {
  items?: GmailItem[];
  item?: GmailItem;
  imported?: number;
  error?: string;
};

type FollowUpCandidate = {
  subject: string;
  reason: string;
  urgency: "low" | "normal" | "high" | "urgent";
  suggestedAction: string;
  approvalNote: string;
};

type FollowUpResponse = {
  detection?: {
    candidates: FollowUpCandidate[];
    generatedBy: "openai" | "deterministic";
  };
  error?: string;
};

export function GmailDashboard({
  initialConnected,
  connectionVerified,
  returnTo,
  autoConnect,
  initialItems,
}: {
  initialConnected: boolean;
  connectionVerified: boolean;
  returnTo: string;
  autoConnect: boolean;
  initialItems: GmailItem[];
}) {
  const [isConnected] = useState(initialConnected);
  const didAutoConnect = useRef(false);
  const [items, setItems] = useState(initialItems);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpResponse["detection"] | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const aiReady = items.filter((item) => Boolean(item.suggestedReply)).length;
  const needsAi = items.filter((item) => !item.suggestedReply).length;
  const urgent = items.filter((item) => item.priorityLabel === "urgent").length;
  const meetingAsks = items.filter(
    (item) => item.workflowType === "meeting_request",
  ).length;
  const nextNeedsAi = items.find((item) => !item.suggestedReply);

  const connectCorsair = useCallback(() => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const response = await fetch("/api/corsair/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< HEAD
        body: JSON.stringify({ plugin: "gmail", returnTo }),
=======
        body: JSON.stringify({ returnTo: "/gmail" }),
>>>>>>> 73fa312b9a3e2a8003b1424132c989d573f42073
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to create Corsair connect link.");
        return;
      }

      window.location.href = payload.url;
    });
  }, [returnTo, startTransition]);

  useEffect(() => {
    if (!autoConnect || isConnected || didAutoConnect.current) return;
    didAutoConnect.current = true;
    connectCorsair();
  }, [autoConnect, connectCorsair, isConnected]);

  const syncGmail = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const response = await fetch("/api/triage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 25 }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Unable to sync Gmail.");
        return;
      }

      setItems(payload.items ?? []);
      setMessage(
        `Synced ${payload.imported ?? 0} Gmail message${payload.imported === 1 ? "" : "s"}.`,
      );
    });
  };

  const analyzeItem = (triageItemId: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
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
      setSelectedItemId(payload.item.id);
      setMessage("AI workflow card updated for this Gmail message.");
    });
  };

  const analyzeNextItem = () => {
    if (nextNeedsAi) {
      analyzeItem(nextNeedsAi.id);
      return;
    }

    if (items[0]) setSelectedItemId(items[0].id);
  };

  const executeActionBundle = (triageItemId: string) => {
    if (
      !window.confirm(
        "Create the Gmail draft and Calendar event in this action bundle?",
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);
      setExecutingId(triageItemId);

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageItemId,
          draftReply: true,
          createEvent: true,
          confirmed: true,
        }),
      });
      const payload = (await response.json()) as ApiResponse;

      setExecutingId(null);

      if (!response.ok || payload.error || !payload.item) {
        setError(payload.error ?? "Unable to execute action bundle.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === payload.item?.id ? payload.item : item,
        ),
      );
      setSelectedItemId(payload.item.id);
      setMessage(
        "Action bundle approved: TriageOS created the draft and calendar event through Corsair.",
      );
    });
  };

  const detectFollowUps = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const response = await fetch("/api/gmail/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as FollowUpResponse;

      if (!response.ok || payload.error || !payload.detection) {
        setError(payload.error ?? "Unable to detect follow-ups.");
        return;
      }

      setFollowUps(payload.detection);
      setMessage(
        `Detected ${payload.detection.candidates.length} follow-up candidate${payload.detection.candidates.length === 1 ? "" : "s"}.`,
      );
    });
  };

  return (
    <>
      <Card className="rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <MailCheck className="mr-1.5 size-3.5" /> Gmail via Corsair
            </Badge>
            <CardTitle className="mt-4 text-3xl font-black tracking-tight">
              AI inbox triage
            </CardTitle>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Start with the messages that need a decision, generate workflow
              cards, then approve safe drafts and calendar actions.
            </p>
          </div>
          <Button
            onClick={isConnected ? syncGmail : connectCorsair}
            disabled={isPending}
            className="rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
          >
            {isPending && !analyzingId ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : isConnected ? (
              <RefreshCw className="mr-2 size-4" />
            ) : (
              <PlugZap className="mr-2 size-4" />
            )}
            {isConnected ? "Sync Gmail" : "Connect Gmail"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}
          {isConnected && !connectionVerified ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Connection returned from Corsair. Use Sync Gmail to verify access
              and load messages.
            </div>
          ) : null}
          {isConnected ? (
            <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="AI ready" value={aiReady} />
                    <MetricPill label="Needs AI" value={needsAi} />
                    <MetricPill label="Urgent" value={urgent} />
                    <MetricPill label="Meeting asks" value={meetingAsks} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-emerald-900">
                    {nextNeedsAi
                      ? `Next up: ${nextNeedsAi.subject}`
                      : items.length
                        ? "Every loaded message has an AI workflow card."
                        : "Sync Gmail to create your first workflow cards."}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={items.length ? analyzeNextItem : syncGmail}
                  disabled={isPending}
                  className="rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  {items.length ? "Generate next AI card" : "Sync Gmail"}
                </Button>
                {items.length ? (
                  <Button
                    type="button"
                    onClick={detectFollowUps}
                    disabled={isPending}
                    variant="outline"
                    className="rounded-full border-emerald-200 bg-white"
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    Detect follow-ups
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
          {followUps ? (
            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-amber-950">
                    <Sparkles className="size-4" /> Follow-Up Detection
                  </div>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    TriageOS found messages that likely need a nudge, reply, or
                    scheduling action. Review each before approval.
                  </p>
                </div>
                <Badge className="w-fit rounded-full bg-white text-amber-800 hover:bg-white">
                  {followUps.generatedBy === "openai" ? "OpenAI" : "Fallback"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {followUps.candidates.length ? (
                  followUps.candidates.map((candidate) => (
                    <article
                      key={`${candidate.subject}-${candidate.suggestedAction}`}
                      className="rounded-2xl border border-amber-200 bg-white/80 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge label={candidate.urgency} />
                        <h3 className="font-black tracking-tight">
                          {candidate.subject}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {candidate.reason}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-amber-950">
                        {candidate.suggestedAction}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-800">
                        {candidate.approvalNote}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900">
                    No follow-up candidates detected in the current Gmail set.
                  </p>
                )}
              </div>
            </section>
          ) : null}
          {!isConnected ? (
            <div className="rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
              <PlugZap className="mx-auto size-10 text-emerald-700" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                Connect Gmail to start syncing
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Corsair handles OAuth. Once Gmail is connected, this page will
                show the Sync Gmail action instead.
              </p>
              <Button
                onClick={connectCorsair}
                disabled={isPending}
                className="mt-5 rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
              >
                <PlugZap className="mr-2 size-4" /> Connect Gmail
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Inbox className="mx-auto size-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                No Gmail messages loaded
              </h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge label={item.priorityLabel} />
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
                        {item.suggestedReply ? (
                          <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            <Sparkles className="mr-1 size-3" /> AI ready
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black tracking-tight">
                        {item.subject}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        From {item.fromEmail}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {item.summary ?? item.snippet ?? item.bodyPreview}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <Clock3 className="size-3.5" />
                        {formatDate(item.receivedAt)}
                      </div>
                      <Button
                        type="button"
                        onClick={() => analyzeItem(item.id)}
                        disabled={analyzingId === item.id}
                        size="sm"
                        className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {analyzingId === item.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Bot className="mr-2 size-4" />
                        )}
                        {item.suggestedReply ? "Regenerate AI" : "Generate AI"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GmailDetailDialog
        item={selectedItem}
        isAnalyzing={Boolean(
          selectedItem && analyzingId === selectedItem.id,
        )}
        isExecuting={Boolean(
          selectedItem && executingId === selectedItem.id,
        )}
        onAnalyze={() => {
          if (selectedItem) analyzeItem(selectedItem.id);
        }}
        onExecute={() => {
          if (selectedItem) executeActionBundle(selectedItem.id);
        }}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null);
        }}
      />
    </>
  );
}

function GmailDetailDialog({
  item,
  isAnalyzing,
  isExecuting,
  onAnalyze,
  onExecute,
  onOpenChange,
}: {
  item: GmailItem | null;
  isAnalyzing: boolean;
  isExecuting: boolean;
  onAnalyze: () => void;
  onExecute: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 sm:max-w-4xl">
        {item ? (
          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {item.subject}
              </DialogTitle>
              <DialogDescription>
                From {item.fromEmail} - {formatDateTime(item.receivedAt)}
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
              <Badge variant="outline" className="rounded-full capitalize">
                {item.status}
              </Badge>
            </div>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <Mail className="size-4" /> Original email
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {item.bodyPreview ?? item.snippet ?? "No preview captured."}
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <DetailLine label="Received" value={formatDateTime(item.receivedAt)} />
                <DetailLine label="To" value={formatEmailList(item.toEmails)} />
                {item.ccEmails.length ? (
                  <DetailLine label="Cc" value={formatEmailList(item.ccEmails)} />
                ) : null}
                <DetailLine label="Priority" value={`${item.priorityLabel} (${item.priorityScore}/10)`} />
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    <Sparkles className="size-4" /> AI workflow card
                  </div>
                  <p className="mt-2 text-sm leading-6 text-emerald-950">
                    {item.summary ?? item.changeSummary ?? "No AI card yet."}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 size-4" />
                  )}
                  {item.suggestedReply ? "Regenerate AI" : "Generate AI"}
                </Button>
              </div>
            </section>

            {item.suggestedReply ||
            item.suggestedCalendarAction ||
            item.autopilotScore ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-950 bg-slate-950 p-4 text-white shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                        <CheckCircle2 className="size-4" /> Action bundle
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        Review the reply and calendar action below. TriageOS
                        creates drafts/events only after approval.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={onExecute}
                      disabled={
                        isExecuting ||
                        isAnalyzing ||
                        item.status === "completed" ||
                        !item.suggestedReply
                      }
                      className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    >
                      {isExecuting ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 size-4" />
                      )}
                      {item.status === "completed"
                        ? "Bundle completed"
                        : "Approve bundle"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <MailCheck className="size-4" /> Draft in bundle
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {item.suggestedReply ?? "No reply suggested."}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <CalendarClock className="size-4" /> Calendar in bundle
                    </div>
                    <CalendarAction action={item.suggestedCalendarAction} />
                    {item.autopilotScore ? (
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                        <div className="flex items-center gap-2 font-black text-slate-950">
                          <CheckCircle2 className="size-4 text-emerald-700" />
                          {Math.round(item.autopilotScore.confidence * 100)}%
                          confidence
                        </div>
                        <p className="mt-1">
                          Saves about{" "}
                          {item.autopilotScore.estimatedMinutesSaved} min.{" "}
                          {item.autopilotScore.reasoning}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {item.intentTimeline.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Timeline
                </div>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {item.intentTimeline.map((step, index) => (
                    <li key={`${item.id}-${step}`}>
                      <span className="font-bold text-slate-950">
                        {index + 1}.
                      </span>{" "}
                      {step}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {item.memoryHint ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                {item.memoryHint}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CalendarAction({ action }: { action: SuggestedCalendarAction }) {
  if (!action || action.type === "none") {
    return <p className="text-sm text-slate-600">No calendar action.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-700">
      <p className="font-black text-slate-950">
        {action.title ?? "Untitled event"}
      </p>
      <p>
        {formatCalendarTime(action.startTime)} -{" "}
        {action.durationMinutes ?? 30} min
      </p>
      <p className="flex items-start gap-2">
        <Users className="mt-1 size-4 shrink-0 text-slate-400" />
        {action.attendees.length ? action.attendees.join(", ") : "No attendees"}
      </p>
      {action.description ? <p>{action.description}</p> : null}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm">
      {value} {label}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function PriorityBadge({ label }: { label: string }) {
  const className =
    label === "urgent"
      ? "bg-red-100 text-red-800 hover:bg-red-100"
      : label === "high"
        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
        : label === "low"
          ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
          : "bg-blue-100 text-blue-800 hover:bg-blue-100";

  return (
    <Badge className={`rounded-full capitalize ${className}`}>
      {label}
    </Badge>
  );
}

function formatEmailList(values: string[]) {
  return values.length ? values.join(", ") : "Not captured";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatCalendarTime(value: string | null) {
  if (!value) return "No time set";
  return formatDateTime(value);
}
