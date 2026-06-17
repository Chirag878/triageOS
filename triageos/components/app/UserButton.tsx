import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/db/schema";

export function UserButton({ profile }: { profile: Profile }) {
  return (
    <form action={signOut} className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-bold text-slate-950">
          {profile.fullName ?? profile.email}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
          {profile.plan}
        </p>
      </div>
      <Button
        type="submit"
        variant="outline"
        className="rounded-full bg-white/70"
      >
        Sign out
      </Button>
    </form>
  );
}
