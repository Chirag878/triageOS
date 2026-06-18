import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Inbox,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDemoModeEnabled } from "@/config/env";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listCalendarEvents } from "@/lib/calendar/events";
import { getDemoCalendarEvents } from "@/lib/demo/data";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);
  const persistedEvents = await listCalendarEvents(profile.id);
  const demoMode = isDemoModeEnabled();
  const events =
    persistedEvents.length > 0
      ? persistedEvents
      : demoMode
        ? getDemoCalendarEvents(5).map((event) => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            attendees: event.attendees,
            description: event.description,
            timezone: event.timezone ?? "UTC",
            location: event.location,
            status: event.status,
            externalUrl: event.htmlLink,
          }))
        : [];
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);

  const aiReady = items.filter((item) => Boolean(item.suggestedReply));
  const urgent = items.filter((item) => item.priorityLabel === "urgent");
  const meetingAsks = items.filter(
    (item) => item.workflowType === "meeting_request",
  );
  const needsAi = items.filter((item) => !item.suggestedReply);
  const connectedCount =
    Number(connection?.gmailConnected ?? false) +
    Number(connection?.calendarConnected ?? false);
  const priorities = buildPriorities({ urgent, aiReady, meetingAsks, needsAi });
  const recommendations = buildRecommendations({
    aiReady,
    meetingAsks,
    needsAi,
    eventCount: events.length,
  });
  const smartDayPlan = buildSmartDayPlan({
    events,
    urgentCount: urgent.length,
    aiReadyCount: aiReady.length,
    meetingAskCount: meetingAsks.length,
  });
  const focusScore = calculateFocusScore({
    eventCount: events.length,
    urgentCount: urgent.length,
    aiReadyCount: aiReady.length,
    connectedCount,
  });

  return (
    <AppShell profile={profile} active="/briefing">
      <section className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden">
        <header className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 text-slate-950 shadow-sm shadow-slate-900/[0.03] md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge className="rounded-lg bg-slate-950 text-white hover:bg-slate-950">
                <Sparkles className="mr-1.5 size-3.5" /> Briefing
              </Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
                Your operating room for today.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                TriageOS watches Gmail and Calendar, then surfaces the decisions
                that need your approval.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-slate-200 bg-[#f6f7f9] p-4 lg:w-72">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Focus Score
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-tight">
                    {focusScore.score}
                    <span className="text-base text-slate-400">/100</span>
                  </p>
                </div>
                {demoMode ? (
                  <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Demo
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {focusScore.reason}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <DecisionSection
            eyebrow="What needs attention"
            title="Today's Priorities"
            icon={Inbox}
            ctaHref="/gmail"
            ctaLabel="Open Inbox"
          >
            <div className="space-y-3">
              {priorities.map((priority) => (
                <PriorityItem key={priority.title} {...priority} />
              ))}
            </div>
          </DecisionSection>

          <DecisionSection
            eyebrow="What AI recommends"
            title="AI Recommendations"
            icon={Sparkles}
            ctaHref="/workflows"
            ctaLabel="Open Work Queue"
          >
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <RecommendationItem
                  key={recommendation.title}
                  {...recommendation}
                />
              ))}
            </div>
          </DecisionSection>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <DecisionSection
            eyebrow="What happens next"
            title="Today's Schedule"
            icon={CalendarCheck}
            ctaHref="/calendar"
            ctaLabel="Open Schedule"
          >
            <div className="space-y-3">
              {events.slice(0, 4).map((event) => (
                <ScheduleItem
                  key={event.id}
                  title={event.title}
                  time={formatTime(event.startTime)}
                  attendees={event.attendees.length}
                />
              ))}
              {events.length === 0 ? (
                <EmptyState
                  title="No schedule context yet"
                  text="Sync Calendar so TriageOS can prep meetings and protect focus time."
                  href="/calendar"
                  action="Sync Schedule"
                />
              ) : null}
            </div>
          </DecisionSection>

          <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Smart Day Plan
              </p>
              <div className="mt-4 space-y-3">
                {smartDayPlan.slice(0, 3).map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </AppShell>
  );
}

function DecisionSection({
  eyebrow,
  title,
  icon: Icon,
  ctaHref,
  ctaLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Inbox;
  ctaHref: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <Icon className="size-5 shrink-0 text-slate-500" />
              {title}
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-xl bg-white sm:w-auto"
          >
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function PriorityItem({
  tone,
  title,
  text,
  href,
  action,
}: {
  tone: "urgent" | "normal" | "quiet";
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  const toneClass =
    tone === "urgent"
      ? "border-red-200 bg-red-50"
      : tone === "normal"
        ? "border-blue-200 bg-blue-50"
        : "border-slate-200 bg-slate-50";

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5 ${toneClass}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-black tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
        </div>
        <span className="shrink-0 text-sm font-black text-slate-950">
          {action}
        </span>
      </div>
    </Link>
  );
}

function RecommendationItem({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div className="min-w-0">
          <h3 className="font-black tracking-tight text-emerald-950">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{text}</p>
        </div>
      </div>
    </Link>
  );
}

function ScheduleItem({
  title,
  time,
  attendees,
}: {
  title: string;
  time: string;
  attendees: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f6f7f9] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-black tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {attendees} attendee{attendees === 1 ? "" : "s"}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-black text-slate-700">
          <Clock3 className="size-4" />
          {time}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f6f7f9] p-5">
      <h3 className="font-black tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <Button asChild variant="outline" className="mt-4 rounded-xl bg-white">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function buildPriorities({
  urgent,
  aiReady,
  meetingAsks,
  needsAi,
}: {
  urgent: { subject: string; summary: string | null; snippet: string }[];
  aiReady: { subject: string; summary: string | null; snippet: string }[];
  meetingAsks: { subject: string; summary: string | null; snippet: string }[];
  needsAi: { subject: string; summary: string | null; snippet: string }[];
}) {
  const priorities = [];
  const urgentItem = urgent[0];
  const aiReadyItem = aiReady[0];
  const meetingAsk = meetingAsks[0];

  if (urgentItem) {
    priorities.push({
      tone: "urgent" as const,
      title: urgentItem.subject,
      text: urgentItem.summary ?? urgentItem.snippet,
      href: "/gmail",
      action: "Review now",
    });
  }

  if (aiReadyItem) {
    priorities.push({
      tone: "normal" as const,
      title: aiReadyItem.subject,
      text: aiReadyItem.summary ?? aiReadyItem.snippet,
      href: "/workflows",
      action: "Approve",
    });
  }

  if (meetingAsk) {
    priorities.push({
      tone: "normal" as const,
      title: meetingAsk.subject,
      text: meetingAsk.summary ?? meetingAsk.snippet,
      href: "/calendar",
      action: "Schedule",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      tone: "quiet" as const,
      title: needsAi[0]?.subject ?? "No urgent decisions detected",
      text: needsAi[0]
        ? "Generate an AI card so TriageOS can recommend the next action."
        : "Sync Inbox and Schedule to populate your operating room.",
      href: needsAi[0] ? "/gmail" : "/gmail",
      action: needsAi[0] ? "Generate AI" : "Sync Inbox",
    });
  }

  return priorities.slice(0, 3);
}

function buildRecommendations({
  aiReady,
  meetingAsks,
  needsAi,
  eventCount,
}: {
  aiReady: { subject: string }[];
  meetingAsks: { subject: string }[];
  needsAi: { subject: string }[];
  eventCount: number;
}) {
  const recommendations = [];

  if (aiReady.length) {
    recommendations.push({
      title: "Approve the highest-confidence bundle",
      text: `${aiReady[0].subject} is ready for review before TriageOS creates anything.`,
      href: "/workflows",
    });
  }

  if (meetingAsks.length) {
    recommendations.push({
      title: "Convert meeting asks into scheduled decisions",
      text: `${meetingAsks.length} message${meetingAsks.length === 1 ? "" : "s"} appear to need calendar action.`,
      href: "/calendar",
    });
  }

  if (needsAi.length) {
    recommendations.push({
      title: "Generate context for unresolved messages",
      text: `${needsAi.length} inbox item${needsAi.length === 1 ? "" : "s"} still need AI interpretation.`,
      href: "/gmail",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Protect the next focus block",
      text:
        eventCount > 0
          ? "Use Schedule to prep the next meeting and avoid reactive work."
          : "Sync Schedule and Inbox so TriageOS can recommend the next move.",
      href: eventCount > 0 ? "/calendar" : "/gmail",
    });
  }

  return recommendations.slice(0, 3);
}

function formatTime(value: string | null) {
  if (!value) return "No time";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function buildSmartDayPlan({
  events,
  urgentCount,
  aiReadyCount,
  meetingAskCount,
}: {
  events: { title: string; startTime: string | null; attendees: string[] }[];
  urgentCount: number;
  aiReadyCount: number;
  meetingAskCount: number;
}) {
  const nextEvent = events.find((event) => event.startTime);

  return [
    urgentCount
      ? `Resolve ${urgentCount} urgent inbox decision${urgentCount === 1 ? "" : "s"} first.`
      : "Start with the next unresolved inbox decision.",
    nextEvent
      ? `Prep ${nextEvent.title} before ${formatTime(nextEvent.startTime)}.`
      : "Protect the first open focus block.",
    aiReadyCount
      ? `Approve ${aiReadyCount} AI-ready workflow${aiReadyCount === 1 ? "" : "s"} after review.`
      : meetingAskCount
        ? `Turn ${meetingAskCount} meeting ask${meetingAskCount === 1 ? "" : "s"} into scheduled actions.`
        : "Sync context before approving external actions.",
  ];
}

function calculateFocusScore({
  eventCount,
  urgentCount,
  aiReadyCount,
  connectedCount,
}: {
  eventCount: number;
  urgentCount: number;
  aiReadyCount: number;
  connectedCount: number;
}) {
  const score = Math.max(
    35,
    Math.min(
      98,
      82 + connectedCount * 4 + aiReadyCount * 2 - eventCount * 3 - urgentCount * 7,
    ),
  );
  const reason =
    score >= 80
      ? "Clear enough to execute after review."
      : score >= 60
        ? "Good, but urgent items need attention."
        : "Needs fresh Inbox and Schedule context.";

  return { score, reason };
}
