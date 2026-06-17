import { ResetPasswordForm } from "@/components/auth/PasswordForms";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  await requireUser();

  return (
    <main className="min-h-screen bg-[#f7f4ea] px-6 py-6 text-slate-950 sm:px-10 lg:px-16">
      <section className="mx-auto flex max-w-7xl items-center justify-center py-20">
        <ResetPasswordForm />
      </section>
    </main>
  );
}
