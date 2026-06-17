import { CalendarCheck, MailCheck, ShieldCheck, Sparkles } from "lucide-react";

import { UserButton } from "@/components/app/UserButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const nextSteps = [
  {
    icon: ShieldCheck,
    title: "Auth ready",
    text: "Supabase profile, role, plan, preferences, and usage rows are created on sign-in.",
    done: true,
  },
  {
    icon: MailCheck,
    title: "Connect Gmail via Corsair",
    text: "Next task: build the Corsair connection route and store Gmail connection IDs.",
  },
  {
    icon: CalendarCheck,
    title: "Connect Calendar via Corsair",
    text: "Then create the first real calendar event from a confirmed workflow card.",
  },
];

export default async function DashboardPage() {
  const profile = await requireUser();

  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-6 text-slate-950 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2 font-black tracking-tight">
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white">
            🐼
          </span>
          <span>TriageOS</span>
        </div>
        <UserButton profile={profile} />
      </nav>

      <section className="mx-auto max-w-7xl py-12">
        <Badge className="rounded-full bg-emerald-100 px-4 py-1.5 text-emerald-800 hover:bg-emerald-100">
          <Sparkles className="mr-1.5 size-3.5" /> Backend sprint step 1
          complete
        </Badge>
        <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">
          Welcome, {profile.fullName ?? profile.email.split("@")[0]}.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Your TriageOS identity is ready. The fastest path now is Corsair
          connection → Gmail ingestion → AI cards → confirmed execution.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {nextSteps.map((step) => (
            <Card
              key={step.title}
              className="rounded-[2rem] border-white/70 bg-white/75 shadow-sm backdrop-blur-xl"
            >
              <CardContent className="p-7">
                <step.icon className="size-9 text-emerald-700" />
                <div className="mt-5 flex items-center gap-3">
                  <h2 className="text-xl font-black tracking-tight">
                    {step.title}
                  </h2>
                  {step.done ? (
                    <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">
                      Done
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/70 bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/15">
          <p className="font-bold text-emerald-200">
            Execution plan for the next 16–20 hours
          </p>
          <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-4">
            <p>1. Corsair connect/status routes.</p>
            <p>2. Gmail fetch to triage_items.</p>
            <p>3. AI Workflow Card generation.</p>
            <p>4. Confirm modal + execute route.</p>
          </div>
          <Button className="mt-6 rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            Connect Corsair next
          </Button>
        </div>
      </section>
    </main>
  );
}
