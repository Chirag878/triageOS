import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ea] px-6 text-slate-950">
      <div className="max-w-lg rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-2xl shadow-red-950/10 backdrop-blur-xl">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-100 text-2xl">
          !
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.05em]">
          Auth link problem
        </h1>
        <p className="mt-4 text-slate-600">
          {params.message ??
            "Your auth link may be expired or invalid. Please request a fresh sign-in or reset link."}
        </p>
        <Button
          asChild
          className="mt-6 rounded-full bg-slate-950 hover:bg-slate-800"
        >
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </main>
  );
}
