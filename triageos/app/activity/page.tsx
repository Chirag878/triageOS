import { eq } from "drizzle-orm";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db/client";
import { actionLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const profile = await requireUser();
  const logs = await db
    .select()
    .from(actionLogs)
    .where(eq(actionLogs.userId, profile.id))
    .limit(30);

  return (
    <AppShell profile={profile} active="/activity">
      <section className="space-y-6">
        <div>
          <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Activity className="mr-1.5 size-3.5" /> Action audit trail
          </Badge>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-6xl">
            Every confirmed action, visible.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            TriageOS never hides execution. Calendar events and Gmail drafts are
            logged here.
          </p>
        </div>

        <div className="grid gap-3">
          {logs.length === 0 ? (
            <Card className="rounded-[1.75rem] border-dashed bg-white/70">
              <CardContent className="p-10 text-center text-slate-600">
                No actions yet. Execute your first workflow from the dashboard.
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                className="rounded-[1.5rem] border-white/70 bg-white/80 shadow-sm"
              >
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-2xl bg-slate-100">
                      {log.status === "succeeded" ? (
                        <CheckCircle2 className="size-5 text-emerald-700" />
                      ) : (
                        <XCircle className="size-5 text-amber-700" />
                      )}
                    </div>
                    <div>
                      <p className="font-black capitalize tracking-tight">
                        {log.actionType.replaceAll("_", " ")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {log.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit rounded-full capitalize"
                  >
                    {log.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
