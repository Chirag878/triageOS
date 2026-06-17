import {
  ArrowRight,
  CalendarCheck,
  Command,
  MailCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workflowSteps = [
  "Detected meeting request",
  "Pulled your 30-min morning preference",
  "Prepared calendar invite + reply",
  "Waiting for Cmd+Enter confirmation",
];

const cards = [
  {
    icon: MailCheck,
    title: "AI Workflow Cards",
    text: "Email becomes a reviewable decision card with intent, summary, reply, and next action.",
  },
  {
    icon: CalendarCheck,
    title: "Calendar-ready",
    text: "Meeting requests turn into editable invite bundles with attendees, title, time, and notes.",
  },
  {
    icon: Command,
    title: "Keyboard-first",
    text: "Use J/K, E, S, and Cmd+K to fly through your inbox without context switching.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ea] text-slate-950">
      <section className="relative isolate px-6 pb-20 pt-6 sm:px-10 lg:px-16">
        <div className="nature-orb left-[-8rem] top-[-8rem] bg-emerald-300/40" />
        <div className="nature-orb bottom-[20rem] right-[-9rem] bg-amber-300/50" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-xl">
          <Link
            href="/"
            className="flex items-center gap-2 font-black tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white shadow-lg shadow-emerald-900/20">
              🐼
            </span>
            <span>TriageOS</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#workflow">Workflow</a>
            <a href="#pricing-preview">Pricing</a>
            <a href="#theme">Theme</a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden rounded-full sm:inline-flex"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-slate-950 hover:bg-slate-800"
            >
              <Link href="/signup">Register</Link>
            </Button>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl items-center gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <div>
            <Badge className="rounded-full border-emerald-200 bg-emerald-100 px-4 py-1.5 text-emerald-800 hover:bg-emerald-100">
              <Sparkles className="mr-1.5 size-3.5" /> Gen-Z calm mode for Gmail
              + Calendar
            </Badge>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 sm:text-7xl lg:text-8xl">
              Turn every important email into a confirmed next action.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              TriageOS is an AI command center with soft nature energy: Gmail
              shows messages, Calendar shows events, TriageOS shows decisions.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-slate-950 px-7 text-base hover:bg-slate-800"
              >
                <Link href="/signup">
                  Register free <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-slate-300 bg-white/70 px-7 text-base"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[620px]">
            <MountainScene />
            <WorkflowMockup />
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 pb-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="rounded-[2rem] border-white/70 bg-white/70 shadow-sm backdrop-blur-xl"
            >
              <CardContent className="p-7">
                <card.icon className="size-9 text-emerald-700" />
                <h3 className="mt-5 text-xl font-black tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">{card.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="theme" className="px-6 pb-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white/70 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/20 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                Theme locked
              </Badge>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">
                Alpine Panda OS
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/70">
                A calming mountain-and-panda visual system: warm paper
                background, forest green actions, black ink typography, glass
                cards, and soft animated blobs.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Ink", "#0f172a"],
                ["Moss", "#047857"],
                ["Sunlit cream", "#f7f4ea"],
                ["Bamboo", "#a7f3d0"],
              ].map(([name, value]) => (
                <div
                  key={name}
                  className="rounded-3xl border border-white/10 bg-white/10 p-5"
                >
                  <div
                    className="h-16 rounded-2xl"
                    style={{ backgroundColor: value }}
                  />
                  <p className="mt-4 font-bold">{name}</p>
                  <p className="font-mono text-sm text-white/50">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing-preview"
        className="px-6 pb-24 text-center sm:px-10 lg:px-16"
      >
        <h2 className="text-4xl font-black tracking-[-0.04em] md:text-6xl">
          SaaS-ready pricing story
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Starter for trying, Pilot for daily power users, Autopilot for people
          who live in email.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 h-14 rounded-full bg-emerald-700 px-8 hover:bg-emerald-800"
        >
          <Link href="/pricing">Open pricing page</Link>
        </Button>
      </section>
    </main>
  );
}

function WorkflowMockup() {
  return (
    <div className="absolute right-0 top-20 w-full max-w-xl animate-float rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
      <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-emerald-200">AI Workflow Card</p>
          <Badge className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-400">
            87% confident
          </Badge>
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight">
          Launch Plan Sync
        </h2>
        <p className="mt-2 text-white/65">
          Alex wants to meet next Thursday morning to discuss launch milestones.
        </p>
      </div>
      <div className="grid gap-3 p-3">
        <div className="rounded-3xl border bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800">Suggested bundle</p>
          <p className="mt-2 text-sm text-slate-600">
            Create 30-min event · Invite alex@example.com · Send friendly reply
          </p>
        </div>
        <div className="rounded-3xl border bg-white p-4">
          <p className="text-sm font-bold">Intent timeline</p>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            {workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <Button className="h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800">
          <Zap className="mr-2 size-4" /> Confirm with Cmd+Enter
        </Button>
      </div>
    </div>
  );
}

function MountainScene() {
  return (
    <div className="absolute inset-x-0 bottom-0 mx-auto h-[520px] max-w-xl overflow-hidden rounded-[3rem] border border-white/70 bg-gradient-to-b from-sky-200 via-emerald-100 to-amber-100 shadow-xl">
      <div className="absolute left-10 top-14 size-24 rounded-full bg-amber-200 shadow-[0_0_80px_20px_rgba(252,211,77,0.45)]" />
      <div className="absolute bottom-0 left-[-6rem] h-72 w-96 rotate-[-8deg] rounded-t-[5rem] bg-emerald-800" />
      <div className="absolute bottom-0 right-[-5rem] h-80 w-[28rem] rotate-[9deg] rounded-t-[5rem] bg-emerald-700" />
      <div className="absolute bottom-0 left-1/2 h-96 w-[30rem] -translate-x-1/2 rounded-t-[6rem] bg-slate-800" />
      <div className="absolute bottom-56 left-1/2 h-28 w-48 -translate-x-1/2 rounded-t-[6rem] bg-white/90" />
      <div className="panda-head absolute bottom-16 left-12 grid size-36 place-items-center rounded-full bg-white shadow-2xl">
        <div className="absolute -left-2 top-5 size-12 rounded-full bg-slate-950" />
        <div className="absolute -right-2 top-5 size-12 rounded-full bg-slate-950" />
        <div className="absolute left-9 top-12 size-8 rounded-full bg-slate-950" />
        <div className="absolute right-9 top-12 size-8 rounded-full bg-slate-950" />
        <div className="absolute top-[4.3rem] size-4 rounded-full bg-white" />
        <div className="absolute bottom-9 h-5 w-9 rounded-full bg-slate-950" />
      </div>
      <div className="absolute bottom-10 right-10 rounded-3xl border border-white/50 bg-white/35 p-4 text-sm font-bold text-slate-800 backdrop-blur-md">
        calm focus mode 🌲
      </div>
    </div>
  );
}
