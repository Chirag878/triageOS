"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Hourglass,
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
import { Card, CardContent } from "@/components/ui/card";
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

type DecisionCategory =
  | "Needs Reply"
  | "Urgent"
  | "Meeting Requests"
  | "Follow-Ups"
  | "Waiting On Others"
  | "FYI";

const decisionCategories: DecisionCategory[] = [
  "Needs Reply",
  "Urgent",
  "Meeting Requests",
  "Follow-Ups",
  "Waiting On Others",
  "FYI",
];

type DecisionCard = {
  item: GmailItem;
  sender: string;
  company: string;
  category: DecisionCategory;
  waitingTime: string;
  aiInsight: string;
  recommendedAction: string;
  confidence: number;
  cta: "Review" | "Draft Reply" | "Schedule" | "Mark Resolved";
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
  const [followUps, setFollowUps] = useState<
    FollowUpResponse["detection"] | null
  >(null);
  const [selectedCategory, setSelectedCategory] =
    useState<DecisionCategory>("Needs Reply");
  const [isPending, startTransition] = useTransition();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const aiReady = items.filter(hasAiCard).length;
  const urgent = items.filter((item) => item.priorityLabel === "urgent").length;
  const meetingAsks = items.filter(
    (item) => item.workflowType === "meeting_request",
  ).length;
  const nextNeedsAi = items.find((item) => !hasAiCard(item));
  const decisionCards = useMemo(() => items.map(toDecisionCard), [items]);
  const categoryCounts = useMemo(
    () =>
      decisionCategories.reduce<Record<DecisionCategory, number>>(
        (acc, category) => {
          acc[category] = decisionCards.filter(
            (card) => card.category === category,
          ).length;
          return acc;
        },
        {
          "Needs Reply": 0,
          Urgent: 0,
          "Meeting Requests": 0,
          "Follow-Ups": 0,
          "Waiting On Others": 0,
          FYI: 0,
        },
      ),
    [decisionCards],
  );
  const fallbackCategory = decisionCategories.find(
    (category) => categoryCounts[category] > 0,
  );
  const activeCategory =
    categoryCounts[selectedCategory] > 0 || !fallbackCategory
      ? selectedCategory
      : fallbackCategory;
  const visibleCards = decisionCards.filter(
    (card) => card.category === activeCategory,
  );
  const attentionCount = decisionCards.filter(
    (card) => card.category !== "FYI",
  ).length;
  const narrative = buildInboxNarrative({
    attentionCount,
    urgent,
    meetingAsks,
    followUps: categoryCounts["Follow-Ups"],
    waiting: categoryCounts["Waiting On Others"],
  });

  const connectCorsair = useCallback(() => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const response = await fetch("/api/corsair/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plugin: "gmail", returnTo }),
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
        setError(payload.error ?? "Unable to sync Inbox.");
        return;
      }

      setItems(payload.items ?? []);
      setMessage(
        `Synced ${payload.imported ?? 0} conversation${payload.imported === 1 ? "" : "s"} into the AI Inbox.`,
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
        setError(payload.error ?? "Unable to generate AI decision card.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === payload.item?.id ? payload.item : item,
        ),
      );
      setSelectedItemId(payload.item.id);
      setMessage("AI decision card updated for this conversation.");
    });
  };

  const analyzeNextItem = () => {
    if (nextNeedsAi) {
      analyzeItem(nextNeedsAi.id);
      return;
    }

    if (items[0]) {
      setMessage("All loaded conversations already have AI decision cards.");
      setSelectedItemId(items[0].id);
    }
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
      <section className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden">
        <Card className="overflow-hidden rounded-[1.5rem] border-slate-200 bg-white text-slate-950 shadow-sm shadow-slate-900/[0.03]">
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <Badge className="rounded-lg bg-slate-950 text-white hover:bg-slate-950">
                  <Sparkles className="mr-1.5 size-3.5" /> AI Inbox
                </Badge>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                  Conversations, ordered by decisions.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                  {narrative}
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-[#f6f7f9] p-3 sm:w-auto sm:min-w-72">
                <MiniSignal label="Attention" value={attentionCount} />
                <MiniSignal label="AI ready" value={aiReady} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
          <CardContent className="space-y-5 p-5 md:p-6">
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
                Connection returned from Corsair. Use Sync to verify access and
                load the latest conversations.
              </div>
            ) : null}
            {!isConnected ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-[#f6f7f9] p-10 text-center">
              <PlugZap className="mx-auto size-10 text-emerald-700" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                Connect Inbox context
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Corsair connects Gmail so TriageOS can classify conversations
                by decisions.
              </p>
              <Button
                onClick={connectCorsair}
                disabled={isPending}
                className="mt-5 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              >
                <PlugZap className="mr-2 size-4" /> Connect Inbox
              </Button>
            </div>
            ) : items.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-[#f6f7f9] p-10 text-center">
              <Inbox className="mx-auto size-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                No conversations loaded
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Sync once to let TriageOS build your decision categories.
              </p>
              <Button
                onClick={syncGmail}
                disabled={isPending}
                className="mt-5 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              >
                <RefreshCw className="mr-2 size-4" /> Sync Inbox
              </Button>
            </div>
            ) : (
              <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {decisionCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-black transition ${
                      activeCategory === category
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950"
                    }`}
                  >
                    {category}
                    <span className="ml-2 text-xs opacity-70">
                      {categoryCounts[category]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {visibleCards.length ? (
                  visibleCards.map((card) => (
                    <ConversationCard
                      key={card.item.id}
                      card={card}
                      isAnalyzing={analyzingId === card.item.id}
                      onReview={() => setSelectedItemId(card.item.id)}
                      onAnalyze={() => analyzeItem(card.item.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f6f7f9] p-6 text-center lg:col-span-2">
                    <p className="font-black tracking-tight">
                      No {activeCategory.toLowerCase()} conversations.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Choose another decision category or sync fresh context.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-[#f6f7f9] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Operations
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Sync and detection are secondary. The decision layer is
                      the source of truth.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={items.length ? analyzeNextItem : syncGmail}
                      disabled={isPending}
                      className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 size-4" />
                      )}
                      {nextNeedsAi ? "Generate next AI card" : "Review next"}
                    </Button>
                    <Button
                      type="button"
                      onClick={detectFollowUps}
                      disabled={isPending}
                      variant="outline"
                      className="rounded-xl bg-white"
                    >
                      <Hourglass className="mr-2 size-4" />
                      Detect follow-ups
                    </Button>
                    <Button
                      type="button"
                      onClick={syncGmail}
                      disabled={isPending}
                      variant="outline"
                      className="rounded-xl bg-white"
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Sync
                    </Button>
                  </div>
                </div>
              </div>

              {followUps ? (
                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-amber-950">
                    {followUps.candidates.length} follow-up candidate
                    {followUps.candidates.length === 1 ? "" : "s"} detected
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    Review Follow-Ups to convert nudges into approved drafts or
                    schedule actions.
                  </p>
                </div>
              ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>

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
                  <Mail className="size-4" /> Source message
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
                    <Sparkles className="size-4" /> AI decision card
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
                  {hasAiCard(item) ? "Regenerate AI" : "Generate AI"}
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

function MiniSignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm shadow-slate-900/[0.03]">
      <p className="text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function ConversationCard({
  card,
  isAnalyzing,
  onReview,
  onAnalyze,
}: {
  card: DecisionCard;
  isAnalyzing: boolean;
  onReview: () => void;
  onAnalyze: () => void;
}) {
  const needsAi = !hasAiCard(card.item);
  return (
    <article className="group rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">
              {card.sender}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {card.company}
            </p>
          </div>
          <Badge className={categoryClass(card.category)}>
            {card.category}
          </Badge>
        </div>

        <div>
          <h3 className="line-clamp-2 text-xl font-black tracking-tight text-slate-950">
            {card.item.subject}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {card.aiInsight}
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-100 bg-[#f6f7f9] p-3 sm:grid-cols-3">
          <CardSignal label="Waiting" value={card.waitingTime} />
          <CardSignal label="Action" value={card.recommendedAction} />
          <CardSignal label="Confidence" value={`${card.confidence}%`} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={needsAi ? onAnalyze : onReview}
            disabled={isAnalyzing}
            className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : needsAi ? (
              <Bot className="mr-2 size-4" />
            ) : (
              <ArrowIcon />
            )}
            {needsAi ? "Generate AI" : card.cta}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReview}
            className="rounded-xl text-slate-600 hover:text-slate-950"
          >
            Open detail
          </Button>
        </div>
      </div>
    </article>
  );
}

function ArrowIcon() {
  return <CheckCircle2 className="mr-2 size-4" />;
}

function CardSignal({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
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

function toDecisionCard(item: GmailItem): DecisionCard {
  const category = getDecisionCategory(item);
  return {
    item,
    sender: getSenderName(item.fromEmail),
    company: getCompanyName(item.fromEmail),
    category,
    waitingTime: formatWaitingTime(item.receivedAt),
    aiInsight:
      item.summary ??
      item.changeSummary ??
      item.snippet ??
      item.bodyPreview ??
      "TriageOS needs an AI pass to understand the decision.",
    recommendedAction: formatRecommendedAction(item.recommendedAction),
    confidence: item.autopilotScore
      ? Math.round(item.autopilotScore.confidence * 100)
      : item.suggestedReply
        ? 76
        : Math.max(35, Math.min(72, item.priorityScore * 8)),
    cta: getCardCta(item),
  };
}

function hasAiCard(item: GmailItem) {
  return Boolean(
    item.suggestedReply ||
      item.suggestedCalendarAction ||
      item.autopilotScore ||
      item.changeSummary,
  );
}

function getDecisionCategory(item: GmailItem): DecisionCategory {
  if (item.priorityLabel === "urgent") return "Urgent";
  if (item.workflowType === "meeting_request") return "Meeting Requests";
  if (item.workflowType === "follow_up") return "Follow-Ups";
  if (item.workflowType === "needs_reply") return "Needs Reply";
  if (item.recommendedAction === "draft_reply") return "Needs Reply";
  if (item.recommendedAction === "schedule_and_reply") {
    return "Meeting Requests";
  }
  if (item.status === "completed" || item.recommendedAction === "mark_done") {
    return "Waiting On Others";
  }
  return "FYI";
}

function getCardCta(item: GmailItem): DecisionCard["cta"] {
  if (item.status === "completed") return "Mark Resolved";
  if (item.workflowType === "meeting_request") return "Schedule";
  if (item.recommendedAction === "schedule_and_reply") return "Schedule";
  if (item.recommendedAction === "draft_reply" || item.suggestedReply) {
    return "Draft Reply";
  }
  return "Review";
}

function buildInboxNarrative(input: {
  attentionCount: number;
  urgent: number;
  meetingAsks: number;
  followUps: number;
  waiting: number;
}) {
  if (input.attentionCount === 0) {
    return "No conversations require immediate attention. Sync when you want fresh context.";
  }

  const fragments = [
    `${input.attentionCount} conversation${input.attentionCount === 1 ? "" : "s"} require attention`,
  ];
  if (input.urgent) {
    fragments.push(
      `${input.urgent} urgent decision${input.urgent === 1 ? "" : "s"}`,
    );
  }
  if (input.meetingAsks) {
    fragments.push(
      `${input.meetingAsks} meeting${input.meetingAsks === 1 ? "" : "s"} need preparation`,
    );
  }
  if (input.followUps) {
    fragments.push(
      `${input.followUps} follow-up${input.followUps === 1 ? "" : "s"} may unblock a decision`,
    );
  }
  if (input.waiting) {
    fragments.push(
      `${input.waiting} item${input.waiting === 1 ? " is" : "s are"} waiting on others`,
    );
  }

  return `Today, ${fragments.join(", ")}.`;
}

function categoryClass(category: DecisionCategory) {
  const base = "rounded-lg";
  if (category === "Urgent") return `${base} bg-red-100 text-red-800`;
  if (category === "Meeting Requests") {
    return `${base} bg-blue-100 text-blue-800`;
  }
  if (category === "Follow-Ups") return `${base} bg-amber-100 text-amber-800`;
  if (category === "Waiting On Others") {
    return `${base} bg-purple-100 text-purple-800`;
  }
  if (category === "FYI") return `${base} bg-slate-100 text-slate-700`;
  return `${base} bg-emerald-100 text-emerald-800`;
}

function getSenderName(value: string) {
  const name = value.match(/^([^<]+)</)?.[1]?.trim();
  if (name) return name.replace(/^"|"$/g, "");
  return extractEmailAddress(value).split("@")[0] ?? "Unknown sender";
}

function getCompanyName(value: string) {
  const domain = extractEmailAddress(value).split("@")[1];
  if (!domain) return "Unknown company";
  const company = domain.split(".")[0] ?? domain;
  return company.charAt(0).toUpperCase() + company.slice(1);
}

function extractEmailAddress(value: string) {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
}

function formatRecommendedAction(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWaitingTime(value: string) {
  const received = new Date(value).getTime();
  if (!Number.isFinite(received)) return "Unknown";
  const diffHours = Math.max(0, Math.round((Date.now() - received) / 3_600_000));
  if (diffHours < 1) return "Now";
  if (diffHours < 24) return `${diffHours}h`;
  const days = Math.round(diffHours / 24);
  return `${days}d`;
}

function formatEmailList(values: string[]) {
  return values.length ? values.join(", ") : "Not captured";
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
