import { Camera, Clock, ImageIcon, Settings } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireUser();

  return (
    <AppShell profile={profile} active="/settings">
      <section className="space-y-6">
        <div>
          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Settings className="mr-1.5 size-3.5" /> Workspace vibe
          </Badge>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">
            Make the command center feel like yours.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            You can use your own photo as the visual theme. Put it at
            <code className="mx-1 rounded bg-white px-1.5 py-0.5">
              public/theme/hero.jpg
            </code>
            and the product can use it in future themed panels.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
            <div className="relative min-h-72 bg-[url('/theme/hero.jpg')] bg-cover bg-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/20 to-emerald-500/30" />
              <div className="relative flex min-h-72 flex-col justify-end p-6 text-white">
                <Badge className="w-fit rounded-full bg-white/20 text-white hover:bg-white/20">
                  <ImageIcon className="mr-1.5 size-3.5" /> Optional theme image
                </Badge>
                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-[-0.04em]">
                  Mountains, nature, panda energy — anything that makes work
                  feel lighter.
                </h2>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <PreferenceCard
              icon={Clock}
              title="Default meeting duration"
              value="30 minutes"
            />
            <PreferenceCard
              icon={Camera}
              title="Theme source"
              value="public/theme/hero.jpg"
            />
            <PreferenceCard
              icon={Settings}
              title="Reply tone"
              value="Concise friendly"
            />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function PreferenceCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Clock;
  title: string;
  value: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-white/70 bg-white/80 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="font-black tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
