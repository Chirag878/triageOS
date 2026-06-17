import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/PasswordForms";

export default function ForgotPasswordPage() {
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
        <Link
          href="/login"
          className="text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          Back to login
        </Link>
      </nav>
      <section className="mx-auto flex max-w-7xl items-center justify-center py-20">
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
