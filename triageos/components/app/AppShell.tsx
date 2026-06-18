import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  FileText,
  Inbox,
  MailCheck,
  Settings,
  Sparkles,
} from "lucide-react";

import { UserButton } from "@/components/app/UserButton";
import { CommandPalette } from "@/components/command/CommandPalette";
import { Badge } from "@/components/ui/badge";
import type { requireUser } from "@/lib/auth/session";

type Profile = Awaited<ReturnType<typeof requireUser>>;

const navItems = [
  { href: "/briefing", label: "Briefing", icon: FileText },
  { href: "/gmail", label: "Inbox", icon: MailCheck },
  { href: "/calendar", label: "Schedule", icon: CalendarCheck },
  { href: "/workflows", label: "Work Queue", icon: Inbox },
  { href: "/activity", label: "History", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  profile,
  children,
  active = "/briefing",
}: {
  profile: Profile;
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <CommandPalette />
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-12rem] top-[-8rem] size-[32rem] rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-[-10rem] top-32 size-[28rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 size-[30rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-2xl lg:block">
          <Link href="/briefing" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-400 text-xl text-slate-950 shadow-lg shadow-slate-900/15">
              🐼
            </span>
            <div>
              <p className="text-lg font-black tracking-tight text-white">
                TriageOS
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Decisions, not inboxes
              </p>
            </div>
          </Link>

          <div className="mt-8 rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/10 p-4">
            <Badge className="rounded-full bg-emerald-300 text-emerald-950 hover:bg-emerald-300">
              <Sparkles className="mr-1 size-3" /> AI command center
            </Badge>
            <p className="mt-3 text-sm leading-6 text-emerald-100">
              AI Chief of Staff for Gmail and Calendar decisions.
            </p>
          </div>

          <nav className="mt-7 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Next action
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Start with Briefing, then review Inbox, Schedule, and Work Queue.
            </p>
          </div>
        </aside>

        <section className="px-5 py-5 sm:px-8 lg:px-10">
          <header className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/10 px-4 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-2 font-black tracking-tight lg:hidden">
              <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-lg text-white">
                🐼
              </span>
              <span>TriageOS</span>
            </div>
            <div className="hidden items-center gap-2 text-sm font-semibold text-slate-300 lg:flex">
              <CalendarCheck className="size-4 text-emerald-300" />
              AI Chief of Staff for Gmail + Calendar
            </div>
            <div className="flex items-center gap-2">
              <UserButton profile={profile} />
            </div>
          </header>

          <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? "border-emerald-300 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-white/10 text-slate-200"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-auto max-w-7xl py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
