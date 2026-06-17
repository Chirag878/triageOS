import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "$0",
    tone: "For trying the workflow-card magic",
    features: [
      "Gmail + Calendar via Corsair",
      "25 AI Workflow Cards/mo",
      "Basic summaries",
      "Keyboard shortcuts",
    ],
  },
  {
    name: "Pilot",
    price: "$12",
    tone: "For daily productivity users",
    popular: true,
    features: [
      "1,000 AI Workflow Cards/mo",
      "Suggested replies",
      "Calendar action bundles",
      "Command palette",
      "Autopilot Score",
    ],
  },
  {
    name: "Autopilot",
    price: "$29",
    tone: "For people who live in email",
    features: [
      "Unlimited email analysis",
      "Corsair MCP agent chat",
      "Intent Timeline",
      "What Changed?",
      "Advanced Command Memory",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-6 text-slate-950 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-2 font-black tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white">
            🐼
          </span>
          <span>TriageOS</span>
        </Link>
        <Button asChild variant="outline" className="rounded-full bg-white/60">
          <Link href="/">Back home</Link>
        </Button>
      </nav>

      <section className="mx-auto max-w-4xl py-16 text-center md:py-24">
        <Badge className="rounded-full bg-emerald-100 px-4 py-1.5 text-emerald-800 hover:bg-emerald-100">
          <Sparkles className="mr-1.5 size-3.5" /> Pricing built for the SaaS
          story
        </Badge>
        <h1 className="mt-6 text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">
          Pay for decisions, not inbox anxiety.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Start free, upgrade when TriageOS becomes your daily command center
          for confirmed email and calendar workflows.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 pb-20 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative rounded-[2rem] border-white/70 bg-white/75 shadow-sm backdrop-blur-xl ${plan.popular ? "ring-4 ring-emerald-300" : ""}`}
          >
            {plan.popular ? (
              <Badge className="absolute right-6 top-6 rounded-full bg-slate-950 text-white hover:bg-slate-950">
                Most demo-friendly
              </Badge>
            ) : null}
            <CardHeader className="p-7 pb-2">
              <CardTitle className="text-2xl font-black tracking-tight">
                {plan.name}
              </CardTitle>
              <p className="text-slate-600">{plan.tone}</p>
              <div className="pt-6">
                <span className="text-5xl font-black tracking-[-0.05em]">
                  {plan.price}
                </span>
                <span className="text-slate-500">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="p-7 pt-4">
              <Button className="h-12 w-full rounded-2xl bg-slate-950 hover:bg-slate-800">
                Choose {plan.name}
              </Button>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-slate-700"
                  >
                    <Check className="size-5 shrink-0 text-emerald-700" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
