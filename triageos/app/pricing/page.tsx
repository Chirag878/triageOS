import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  Focus,
  HelpCircle,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "for starting",
    tone: "Understand what needs attention before the day gets away from you.",
    outcomes: [
      "Start each morning with clearer priorities",
      "Spot the follow-ups most likely to slip",
      "Preview how TriageOS turns context into action",
    ],
  },
  {
    name: "Personal Chief of Staff",
    price: "$18",
    cadence: "per month",
    recommended: true,
    tone: "For operators who want less inbox triage and better meeting readiness every day.",
    outcomes: [
      "Fewer missed replies and follow-ups",
      "Prepared meetings before they hit the calendar",
      "A short work queue instead of an open inbox",
      "Drafts and schedule actions ready for approval",
    ],
  },
  {
    name: "Executive Office",
    price: "$49",
    cadence: "per month",
    tone: "For leaders who need a sharper operating rhythm across high-volume days.",
    outcomes: [
      "Clearer priorities across inbox and schedule",
      "Less time spent deciding what deserves attention",
      "Meeting prep and follow-up loops handled with discipline",
      "A calmer review layer before work is executed",
    ],
  },
];

const values = [
  ["3-5 hrs", "less inbox triage each week"],
  ["2x", "more consistent meeting preparation"],
  ["0", "actions executed without approval"],
];

const styles = [
  {
    icon: Compass,
    name: "Mission Control",
    text: "Surfaces the highest-leverage decisions first and keeps the day moving.",
  },
  {
    icon: UserRound,
    name: "Executive",
    text: "Concise, direct, and oriented around delegation, prep, and follow-through.",
  },
  {
    icon: Focus,
    name: "Focus",
    text: "Minimizes noise so only urgent, blocking, or scheduled work breaks through.",
  },
  {
    icon: Palette,
    name: "Studio",
    text: "Balances creative context with crisp next actions for project-heavy days.",
  },
  {
    icon: Moon,
    name: "Midnight",
    text: "A quiet operating mode for deep work, late review, and low-interruption planning.",
  },
];

const faqs = [
  {
    question: "Is this billing live?",
    answer:
      "No. This page explains packaging and value. Billing logic has not been implemented.",
  },
  {
    question: "What am I paying for?",
    answer:
      "Better decisions: fewer missed follow-ups, less triage, stronger meeting prep, and clearer priorities.",
  },
  {
    question: "Does TriageOS replace Gmail or Calendar?",
    answer:
      "No. It sits above them as an AI Chief of Staff and prepares actions for your approval.",
  },
  {
    question: "Can I keep control?",
    answer:
      "Yes. TriageOS recommends and prepares work, but execution remains approval-based.",
  },
];

export default function PricingPage() {
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

      <section className="border-b border-slate-200 bg-white px-4 py-20 md:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Badge className="rounded-lg bg-slate-950 px-3 py-1.5 text-white hover:bg-slate-950">
            <Sparkles className="mr-1.5 size-3.5" />
            Pricing for an AI Chief of Staff
          </Badge>
          <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[1.03] md:text-7xl">
            Buy back the time you spend deciding what matters.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            TriageOS helps you miss fewer follow-ups, prepare better for
            meetings, triage less inbox noise, and start each day with clearer
            priorities.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
              <Link href="/">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                plan.recommended
                  ? "border-slate-950 shadow-2xl shadow-slate-900/10"
                  : "border-slate-200"
              }`}
            >
              {plan.recommended ? (
                <Badge className="absolute right-5 top-5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Recommended
                </Badge>
              ) : null}
              <div className="pr-28">
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <p className="mt-3 min-h-20 leading-7 text-slate-600">
                  {plan.tone}
                </p>
              </div>
              <div className="mt-8">
                <span className="text-5xl font-black tracking-tight">
                  {plan.price}
                </span>
                <span className="ml-2 text-sm font-semibold text-slate-500">
                  {plan.cadence}
                </span>
              </div>
              <Button
                asChild
                className={`mt-7 h-12 w-full ${
                  plan.recommended
                    ? "rounded-xl bg-slate-950 hover:bg-slate-800"
                    : "rounded-xl bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Link href="/signup">Start Your First Briefing</Link>
              </Button>
              <div className="mt-7 border-t border-slate-200 pt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Outcomes
                </p>
                <ul className="mt-4 space-y-3">
                  {plan.outcomes.map((outcome) => (
                    <li
                      key={outcome}
                      className="flex gap-3 text-sm leading-6 text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              Time saved
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              The value is not more software. It is fewer open loops.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {values.map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-[#f6f7f9] p-5"
              >
                <p className="text-4xl font-black">{value}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              Why TriageOS exists
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              Your tools know the facts. They do not protect your attention.
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.03]">
            <p className="text-lg leading-8 text-slate-700">
              Gmail records what happened. Calendar records what is scheduled.
              TriageOS sits above both as an AI Chief of Staff: it understands
              the context, identifies what needs a decision, prepares the next
              step, and waits for approval.
            </p>
            <div className="mt-6 flex gap-3 rounded-xl bg-slate-950 p-4 text-white">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-300" />
              <p className="leading-7 text-white/80">
                The operating principle is simple: recommend clearly, execute
                safely, and keep the human in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              Operating styles
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              Choose how your AI Chief of Staff works.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              These are not themes. They are working modes for different days,
              priorities, and decision rhythms.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {styles.map((style) => (
              <article
                key={style.name}
                className="rounded-xl border border-slate-200 bg-[#f6f7f9] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5"
              >
                <style.icon className="size-6 text-slate-950" />
                <h3 className="mt-8 text-xl font-black">{style.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {style.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              FAQ
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight">
              Pricing without the maze.
            </h2>
          </div>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]"
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

      <section className="border-t border-slate-200 bg-slate-950 px-4 py-20 text-white md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <Badge className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">
            <Clock3 className="mr-1.5 size-3.5" />
            Start with the next ten minutes
          </Badge>
          <h2 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Run one briefing. See what TriageOS thinks should happen next.
          </h2>
          <Button
            asChild
            size="lg"
            className="mt-8 h-13 rounded-xl bg-white px-6 text-base text-slate-950 hover:bg-slate-100"
          >
            <Link href="/signup">
              Start Your First Briefing
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
