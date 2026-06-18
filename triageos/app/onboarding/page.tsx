import Link from "next/link";

import { UserButton } from "@/components/app/UserButton";
import { CorsairConnectionStatus } from "@/components/onboarding/CorsairConnectionStatus";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireUser();

  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-6 text-slate-950 sm:px-10 lg:px-16">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Link
          href="/briefing"
          className="flex items-center gap-2 font-black tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white">
            🐼
          </span>
          <span>TriageOS</span>
        </Link>
        <UserButton profile={profile} />
      </nav>

      <section className="mx-auto grid max-w-7xl gap-8 py-12 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-emerald-700">
            Step 2
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">
            Connect your workflow apps.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            We create one deterministic Corsair tenant per TriageOS user, then
            ask Corsair to handle OAuth for Gmail and Google Calendar.
          </p>
        </div>
        <CorsairConnectionStatus />
      </section>
    </main>
  );
}
