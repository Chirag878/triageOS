import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  Mail,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const problems = [
  "Important asks are buried across threads, invites, and follow-ups.",
  "Your calendar has context, but it does not explain what decisions are due.",
  "AI tools draft text, but rarely connect the inbox, schedule, and approval step.",
];

const steps = [
  {
    title: "Reads the signals",
    text: "TriageOS connects Gmail and Calendar, then builds a concise operating picture.",
  },
  {
    title: "Identifies the decisions",
    text: "It separates replies, meeting requests, urgent blockers, and waiting-on-you work.",
  },
  {
    title: "Prepares the next move",
    text: "Drafts, schedule actions, and work bundles wait for your approval before execution.",
  },
];

const faqs = [
  {
    question: "Is TriageOS an email client?",
    answer:
      "No. Gmail remains your email system. TriageOS sits above it as an AI decision layer.",
  },
  {
    question: "Does it create calendar events automatically?",
    answer:
      "Only after approval. TriageOS proposes the event, reply, or action bundle first.",
  },
  {
    question: "Who is this for?",
    answer:
      "Founders, operators, and busy teams who need to turn inbound context into clear next actions.",
  },
  {
    question: "Can I start without changing my workflow?",
    answer:
      "Yes. Connect Gmail and Calendar, run your first briefing, then approve only what you trust.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f7f9] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl md:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-black">
            <span className="grid size-8 place-items-center rounded-lg bg-slate-950 text-white">
              T
            </span>
            <span>TriageOS</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#problem">Problem</a>
            <a href="#how-it-works">How it works</a>
            <a href="#product-preview">Preview</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-xl bg-slate-950 shadow-sm hover:bg-slate-800">
              <Link href="/signup">Start briefing</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f6f7f9] to-transparent" />
        <div className="mx-auto grid min-h-[700px] max-w-7xl content-between gap-12 px-4 py-14 md:px-8 lg:py-20">
          <div className="max-w-5xl">
            <Badge className="rounded-lg bg-slate-950 px-3 py-1.5 text-white hover:bg-slate-950">
              <Sparkles className="mr-1.5 size-3.5" />
              An AI Chief of Staff for Gmail and Calendar
            </Badge>
            <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[1.02] text-slate-950 md:text-7xl lg:text-8xl">
              Your inbox knows what happened.
              <br />
              Your calendar knows what&apos;s scheduled.
              <br />
              TriageOS knows what to do next.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              AI that reads Gmail, understands your calendar, identifies
              priorities, and safely executes work after approval.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-xl bg-slate-950 px-6 text-base shadow-lg shadow-slate-950/10 hover:bg-slate-800"
              >
                <Link href="/signup">
                  Start Your First Briefing
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-xl border-slate-300 bg-white px-6 text-base"
              >
                <a href="#product-preview">
                  <PlayCircle className="mr-2 size-4" />
                  Watch Demo
                </a>
              </Button>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section id="problem" className="border-b border-slate-200 px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">
              The problem
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              Knowledge is split. Decisions are invisible.
            </h2>
          </div>
          <div className="grid gap-3">
            {problems.map((problem) => (
              <div
                key={problem}
                className="rounded-xl border border-slate-200 bg-white p-5 text-lg leading-8 text-slate-700 shadow-sm shadow-slate-900/[0.03]"
              >
                {problem}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-white px-4 py-20 md:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-slate-500">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              From scattered context to approved action.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-xl border border-slate-200 bg-[#f6f7f9] p-6 shadow-sm shadow-slate-900/[0.03]"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-8 text-2xl font-black">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="product-preview" className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">
              Product preview
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              A briefing that tells you what matters now.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              TriageOS does not ask you to browse another inbox. It summarizes
              the day, recommends actions, and keeps execution gated behind
              approval.
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">
              Social proof
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
              Built for the operator who has too many open loops.
            </h2>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-[#f6f7f9] p-6">
            <p className="text-lg leading-8 text-slate-700">
              “TriageOS turns a messy morning into a short list of decisions.”
            </p>
            <p className="mt-4 text-sm font-black text-slate-500">
              Founder testimonial placeholder
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="text-sm font-black uppercase text-emerald-300">
              Pricing preview
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              Start with your first briefing. Upgrade when it becomes habit.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/70">
              Starter for solo operators, Pilot for daily workflows, Autopilot
              for high-volume inbox and calendar execution.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-xl bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">FAQ</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">
              Clear by design.
            </h2>
          </div>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-xl border border-slate-200 bg-[#f6f7f9] p-5"
              >
                <div className="flex gap-3">
                  <HelpCircle className="mt-1 size-5 shrink-0 text-slate-400" />
                  <div>
                    <h3 className="font-black">{faq.question}</h3>
                    <p className="mt-2 leading-7 text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <Badge className="rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-800 hover:bg-emerald-100">
            <ShieldCheck className="mr-1.5 size-3.5" />
            Executes only after approval
          </Badge>
          <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Let Gmail and Calendar keep the records. Let TriageOS decide the
            next move.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-xl bg-slate-950 px-6 text-base hover:bg-slate-800"
            >
              <Link href="/signup">
                Start Your First Briefing
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-xl border-slate-300 bg-white px-6 text-base"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroPreview() {
  return (
    <div className="relative min-h-[270px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-2xl shadow-slate-900/15 md:min-h-[330px] md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.28),transparent_32%),radial-gradient(circle_at_82%_30%,rgba(59,130,246,0.2),transparent_30%)]" />
      <div className="relative grid gap-3 md:grid-cols-[1fr_0.7fr]">
        <div className="rounded-xl border border-white/10 bg-white p-4 text-slate-950">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black">Morning briefing</p>
            <Badge className="rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              4 decisions
            </Badge>
          </div>
          <p className="mt-5 text-2xl font-black leading-tight">
            Pricing reply, launch sync, and two follow-ups need approval.
          </p>
          <div className="mt-5 grid gap-2">
            {["Draft pricing response", "Prepare launch sync", "Nudge legal review"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f6f7f9] p-3 text-sm font-semibold"
                >
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-white">
            <Mail className="size-5 text-emerald-300" />
            <p className="mt-4 text-sm font-black">Inbox signal</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Customer waiting on pricing for 19h.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-white">
            <CalendarDays className="size-5 text-blue-300" />
            <p className="mt-4 text-sm font-black">Calendar signal</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Open slot at 10:30 AM before investor call.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-500">Today</p>
          <h3 className="text-2xl font-black">Chief of Staff queue</h3>
        </div>
        <Badge className="w-fit rounded-lg bg-slate-950 text-white hover:bg-slate-950">
          Approval required
        </Badge>
      </div>
      <div className="grid gap-3 py-4">
        {[
          ["Needs reply", "Send customer pricing draft", "92% confidence"],
          ["Meeting request", "Create 30-min launch sync", "Calendar clear"],
          ["Follow-up", "Nudge security questionnaire", "Unblocks deal"],
        ].map(([label, title, meta]) => (
          <article
            key={title}
            className="rounded-xl border border-slate-200 bg-[#f6f7f9] p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  {label}
                </p>
                <h4 className="mt-1 text-lg font-black">{title}</h4>
              </div>
              <span className="text-sm font-semibold text-slate-500">{meta}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-xl bg-slate-950 p-4 text-white">
        <p className="text-sm font-black text-emerald-300">Recommended next action</p>
        <p className="mt-2 leading-7 text-white/80">
          Approve one reply and one calendar event. Defer FYI threads until
          after the investor call.
        </p>
      </div>
    </div>
  );
}
