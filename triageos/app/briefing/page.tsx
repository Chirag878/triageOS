import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Inbox,
  MailCheck,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const connectedCount = Number(connection?.gmailConnected ?? false) +
    Number(connection?.calendarConnected ?? false);
  const nextAction = aiReady[0] ?? urgent[0] ?? meetingAsks[0] ?? items[0];
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
      <section className="space-y-6">
        <div className="rounded-[2.25rem] border border-white/10 bg-white p-7 text-slate-950 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <Sparkles className="mr-1.5 size-3.5" /> Daily Briefing
              </Badge>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-none tracking-tight">
                Your day, distilled into decisions.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                TriageOS combines inbox intent, calendar context, and safe AI
                actions so the next move is obvious.
              </p>
            </div>
            {demoMode ? (
              <Badge className="w-fit rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                Demo workspace
              </Badge>
            ) : null}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <BriefingMetric label="Integrations" value={`${connectedCount}/2`} />
          <BriefingMetric label="Inbox decisions" value={items.length} />
          <BriefingMetric label="AI ready" value={aiReady.length} />
          <BriefingMetric label="Upcoming events" value={events.length} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card className="rounded-[2rem] border-emerald-200 bg-emerald-50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black text-emerald-950">
                <Sparkles className="size-5 text-emerald-700" /> Smart Day Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {smartDayPlan.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-emerald-200 bg-white/75 p-4"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Block {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-950">
                    {step}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-blue-200 bg-blue-50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                Focus Score
              </p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-6xl font-black tracking-tight text-blue-950">
                  {focusScore.score}
                </span>
                <span className="pb-2 text-sm font-black text-blue-800">
                  /100
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-blue-900">
                {focusScore.reason}
              </p>
              <Button
                asChild
                className="mt-5 rounded-full bg-blue-700 text-white hover:bg-blue-600"
              >
                <Link href="/calendar">
                  Improve plan <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <Inbox className="size-5 text-emerald-700" /> Inbox decisions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href="/gmail"
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full capitalize">
                      {item.priorityLabel}
                    </Badge>
                    {item.suggestedReply ? (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        AI ready
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-black tracking-tight">
                    {item.subject}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                    {item.summary ?? item.snippet}
                  </p>
                </Link>
              ))}
              {items.length === 0 ? (
                <EmptyBriefing
                  title="No inbox decisions yet"
                  text="Sync Gmail or enable Demo Mode to populate the briefing."
                  href="/gmail"
                  action="Open Gmail"
                />
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <CalendarCheck className="size-5 text-blue-700" /> Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
                  >
                    <h3 className="font-black tracking-tight">{event.title}</h3>
                    <p className="mt-1 text-sm text-blue-900">
                      {formatTime(event.startTime)} -{" "}
                      {event.attendees.length} attendees
                    </p>
                  </div>
                ))}
                {events.length === 0 ? (
                  <EmptyBriefing
                    title="No calendar context"
                    text="Sync Calendar to bring meetings into the briefing."
                    href="/calendar"
                    action="Open Calendar"
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-emerald-200 bg-emerald-50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-black text-emerald-950">
                  <CheckCircle2 className="size-5" /> Next best action
                </div>
                <p className="mt-3 text-sm leading-6 text-emerald-900">
                  {nextAction
                    ? `${nextAction.subject} is the best card to review next.`
                    : "Connect and sync Gmail to create your first AI workflow card."}
                </p>
                <Button
                  asChild
                  className="mt-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  <Link href={nextAction ? "/gmail" : "/briefing"}>
                    {nextAction ? "Review in Gmail" : "Start setup"}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <QuickAction
            icon={MailCheck}
            title="Sync Gmail"
            text="Pull fresh messages and turn them into workflow cards."
            href="/gmail"
          />
          <QuickAction
            icon={CalendarCheck}
            title="Sync Calendar"
            text="Load upcoming meetings and prep context for the day."
            href="/calendar"
          />
        </section>
      </section>
    </AppShell>
  );
}

function BriefingMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
      <CardContent className="p-5">
        <p className="text-3xl font-black tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyBriefing({
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <h3 className="font-black tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <Button asChild variant="outline" className="mt-4 rounded-full bg-white">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof MailCheck;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-black tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        </div>
        <Button asChild size="icon" className="rounded-full">
          <Link href={href}>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
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
  const plan = [
    urgentCount
      ? `Start with ${urgentCount} urgent inbox decision${urgentCount === 1 ? "" : "s"} before meetings begin.`
      : "Start with a 20 minute inbox scan and clear anything that blocks the day.",
    nextEvent
      ? `Prep ${nextEvent.title} before ${formatTime(nextEvent.startTime)} using Gmail context and attendee notes.`
      : "Protect the first open block for focused work; no synced meeting is currently competing for attention.",
    aiReadyCount
      ? `Approve or edit ${aiReadyCount} AI-ready workflow card${aiReadyCount === 1 ? "" : "s"} when the recommendations look right.`
      : "Generate AI cards for the next Gmail messages before approving any external action.",
  ];

  if (meetingAskCount) {
    plan.push(
      `Resolve ${meetingAskCount} meeting ask${meetingAskCount === 1 ? "" : "s"} by turning approved emails into drafts and calendar events.`,
    );
  } else {
    plan.push("End with a Calendar sync so tomorrow's briefing starts with fresh context.");
  }

  return plan;
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
      ? "High confidence: integrations are connected and the workload is reviewable."
      : score >= 60
        ? "Moderate focus: clear the urgent inbox items and prep the next meeting."
        : "Low focus: sync context, resolve urgent messages, and avoid approving actions until details are reviewed.";

  return { score, reason };
}
