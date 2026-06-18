import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";

export function AuthShell({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f4ea] px-4 py-5 text-slate-950 sm:px-10 lg:px-16">
      <div className="nature-orb left-[-8rem] top-[-8rem] hidden bg-emerald-300/40 sm:block" />
      <div className="nature-orb bottom-[8rem] right-[-9rem] hidden bg-amber-300/50 sm:block" />

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
        <Link
          href="/pricing"
          className="text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          Pricing
        </Link>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
        <div className="min-w-0">
          <p className="font-bold uppercase tracking-[0.25em] text-emerald-700">
            Secure app identity
          </p>
          <h1 className="mt-5 text-4xl font-black leading-none tracking-tight md:text-7xl">
            Sign in before connecting Gmail.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Supabase handles TriageOS identity. Corsair handles Gmail and Google
            Calendar access later, so we never build or store raw Google OAuth
            tokens.
          </p>
          <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/70 p-5 backdrop-blur-xl">
            <p className="font-bold">Next after auth</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Create profile + preferences rows.</li>
              <li>2. Connect Gmail and Calendar through Corsair.</li>
              <li>3. Generate AI workflow cards from real messages.</li>
            </ol>
          </div>
        </div>
        <div className="min-w-0">
          <AuthForm defaultTab={mode} />
        </div>
      </section>
    </main>
  );
}
