import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Inbox,
  Keyboard,
  MailCheck,
  PlugZap,
  Sparkles,
  Wand2,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { TriageDashboard } from "@/components/triage/TriageDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDemoModeEnabled } from "@/config/env";
import { db } from "@/db/client";
import { corsairConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireUser();
  const items = await listTriageItems(profile.id);
  const [connection] = await db
    .select()
    .from(corsairConnections)
    .where(eq(corsairConnections.userId, profile.id))
    .limit(1);
  const gmailConnected = connection?.gmailConnected ?? false;
  const calendarConnected = connection?.calendarConnected ?? false;
  const aiReady = items.filter((item) => Boolean(item.suggestedReply)).length;
  const completed = items.filter((item) => item.status === "completed").length;
  const demoMode = isDemoModeEnabled();
  const primaryAction = getPrimaryAction({
    gmailConnected,
    calendarConnected,
    totalItems: items.length,
    aiReady,
  });

  return (
    <AppShell profile={profile} active="/dashboard">
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/10">
            <div className="absolute right-[-5rem] top-[-5rem] size-64 rounded-full bg-emerald-400/25 blur-3xl" />
            <div className="absolute bottom-[-6rem] left-[-4rem] size-72 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative">
              <Badge className="rounded-full bg-white/10 px-4 py-1.5 text-white hover:bg-white/10">
                <Sparkles className="mr-1.5 size-3.5" /> Today&apos;s AI
                workflow room
              </Badge>
              {demoMode ? (
                <Badge className="ml-2 rounded-full bg-amber-300 text-amber-950 hover:bg-amber-300">
                  Demo mode
                </Badge>
              ) : null}
              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">
                Hey {profile.fullName ?? profile.email.split("@")[0]},
                let&apos;s turn emails into decisions.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
                Follow the glowing path: sync Gmail, generate an AI card, review
                the reply/event, then approve the action bundle.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroStep
                  number="1"
                  title="Sync"
                  text="Pull fresh Gmail via Corsair"
                />
                <HeroStep
                  number="2"
                  title="Generate"
                  text="Ask AI for the next action"
                />
                <HeroStep
                  number="3"
                  title="Approve"
                  text="Create draft + event safely"
                />
              </div>
              <Button
                asChild
                className="mt-7 rounded-full bg-emerald-400 px-6 text-slate-950 hover:bg-emerald-300"
              >
                <Link href={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[2.25rem] border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="relative min-h-72 bg-[url('/theme/hero.jpg')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-slate-900/45 to-amber-400/20" />
                <div className="relative flex min-h-72 flex-col justify-end p-6 text-white">
                  <Badge className="w-fit rounded-full bg-white/15 text-white hover:bg-white/15">
                    <Wand2 className="mr-1.5 size-3.5" /> Your theme image ready
                  </Badge>
                  <p className="mt-4 text-2xl font-black tracking-[-0.04em]">
                    Drop your photo at public/theme/hero.jpg to make this panel
                    yours.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 p-4 text-center">
                <MiniMetric label="Cards" value={items.length} />
                <MiniMetric label="AI ready" value={aiReady} />
                <MiniMetric label="Done" value={completed} />
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard
            icon={gmailConnected ? CheckCircle2 : MailCheck}
            label="Gmail"
            value={gmailConnected ? "Connected" : "Missing"}
            href={gmailConnected ? "/gmail" : "/gmail?connect=1"}
          />
          <StatusCard
            icon={calendarConnected ? CheckCircle2 : CalendarCheck}
            label="Calendar"
            value={calendarConnected ? "Connected" : "Missing"}
            href={calendarConnected ? "/calendar" : "/calendar?connect=1"}
          />
          <StatusCard
            icon={Sparkles}
            label="AI-ready cards"
            value={aiReady}
            href={aiReady > 0 ? "/gmail" : "/gmail"}
          />
          <StatusCard
            icon={Inbox}
            label="Briefing"
            value={items.length > 0 ? "Ready" : "Waiting"}
            href="/briefing"
          />
        </section>

        <section
          id="command-palette-preview"
          className="grid gap-4 md:grid-cols-3"
        >
          {!gmailConnected ? (
            <ConnectCard
              icon={MailCheck}
              title="Connect Gmail"
              text="Start on the Gmail page to connect through Corsair and sync messages."
              href="/gmail?connect=1"
            />
          ) : null}
          {!calendarConnected ? (
            <ConnectCard
              icon={CalendarCheck}
              title="Connect Calendar"
              text="Start on the Calendar page to connect through Corsair and sync events."
              href="/calendar?connect=1"
            />
          ) : null}
          <GuideCard
            icon={MailCheck}
            title="Where are my emails?"
            text="They appear below after Sync Gmail. Click any card body to open the full detail view."
          />
          <GuideCard
            icon={Sparkles}
            title="Where is AI?"
            text="Use Generate AI on a card or inside the detail panel. AI output is not created silently."
          />
          <GuideCard
            icon={Keyboard}
            title="Command center"
            text="Use Cmd/Ctrl+K to draft replies or create calendar actions from natural language."
          />
        </section>

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
            suggestedReply: item.suggestedReply,
            suggestedCalendarAction: item.suggestedCalendarAction as {
              type: string;
              title: string | null;
              attendees: string[];
              startTime: string | null;
              durationMinutes: number | null;
              timezone: string | null;
              description: string | null;
            } | null,
            autopilotScore: item.autopilotScore as {
              confidence: number;
              estimatedMinutesSaved: number;
              reasoning: string;
            } | null,
            changeSummary: item.changeSummary,
            status: item.status,
            intentTimeline: Array.isArray(item.intentTimeline)
              ? (item.intentTimeline as string[])
              : [],
            memoryHint: item.memoryHint,
          }))}
        />
      </section>
    </AppShell>
  );
}

function HeroStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-black">
        <span className="grid size-7 place-items-center rounded-full bg-white text-slate-950">
          {number}
        </span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function GuideCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof MailCheck;
  title: string;
  text: string;
}) {
  return (
    <Card className="group rounded-[1.75rem] border-white/70 bg-white/75 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 transition group-hover:scale-110">
            <Icon className="size-5" />
          </div>
          <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-900" />
        </div>
        <h2 className="mt-4 font-black tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      </CardContent>
    </Card>
  );
}

function getPrimaryAction(input: {
  gmailConnected: boolean;
  calendarConnected: boolean;
  totalItems: number;
  aiReady: number;
}) {
  if (!input.gmailConnected) {
    return { label: "Connect Gmail", href: "/gmail?connect=1" };
  }

  if (!input.calendarConnected) {
    return { label: "Connect Calendar", href: "/calendar?connect=1" };
  }

  if (input.totalItems === 0) {
    return { label: "Sync Gmail", href: "/gmail" };
  }

  if (input.aiReady > 0) {
    return { label: "Review AI actions", href: "/gmail" };
  }

  return { label: "Open Daily Briefing", href: "/briefing" };
}

function StatusCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof MailCheck;
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-slate-400" />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </Link>
  );
}

function ConnectCard({
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
    <Card className="rounded-[1.75rem] border-emerald-200 bg-emerald-50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white text-emerald-800 shadow-sm">
            <Icon className="size-5" />
          </div>
          <Badge className="rounded-full bg-emerald-200 text-emerald-950 hover:bg-emerald-200">
            Missing
          </Badge>
        </div>
        <h2 className="mt-4 font-black tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        <Button
          asChild
          className="mt-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
        >
          <Link href={href}>
            <PlugZap className="mr-2 size-4" /> {title}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
