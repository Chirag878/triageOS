import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const profile = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-10 text-slate-950 sm:px-10 lg:px-16">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-sm backdrop-blur-xl">
        <p className="font-bold uppercase tracking-[0.25em] text-emerald-700">
          Admin only
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
          User plan controls
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Signed in as {profile.email}. This page is route-protected with
          requireAdmin() and is ready for the plan upgrade form next.
        </p>
      </section>
    </main>
  );
}
