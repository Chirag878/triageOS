import { desc, eq } from "drizzle-orm";
import { Activity, CheckCircle2, Clock3, MailCheck, XCircle } from "lucide-react";

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
    .orderBy(desc(actionLogs.createdAt))
    .limit(40);
  const succeeded = logs.filter((log) => log.status === "succeeded").length;
  const running = logs.filter((log) => log.status === "running").length;
  const failed = logs.filter((log) => log.status === "failed").length;

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

        <section className="grid gap-4 md:grid-cols-3">
          <ActivityMetric label="Succeeded" value={succeeded} tone="emerald" />
          <ActivityMetric label="Running" value={running} tone="blue" />
          <ActivityMetric label="Needs attention" value={failed} tone="amber" />
        </section>

        <div className="relative grid gap-3">
          {logs.length === 0 ? (
            <Card className="rounded-[1.75rem] border-dashed bg-white/70">
              <CardContent className="p-10 text-center text-slate-600">
                No actions yet. Approve your first action from Work Queue.
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                className="rounded-[1.5rem] border-white/70 bg-white/80 shadow-sm"
              >
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100">
                      {log.status === "succeeded" ? (
                        <CheckCircle2 className="size-5 text-emerald-700" />
                      ) : log.status === "running" ? (
                        <Clock3 className="size-5 text-blue-700" />
                      ) : (
                        <XCircle className="size-5 text-amber-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black capitalize tracking-tight">
                        {log.actionType.replaceAll("_", " ")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {log.createdAt.toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {describeAction(log.actionType, log.actionPayload)}
                      </p>
                      {log.errorMessage ? (
                        <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {log.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Badge
                      variant="outline"
                      className="w-fit rounded-full capitalize"
                    >
                      {log.status}
                    </Badge>
                    {log.triageItemId ? (
                      <Badge className="w-fit rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                        Gmail workflow
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}

function ActivityMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "blue" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <Card className={`rounded-[1.75rem] shadow-sm ${toneClass}`}>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-sm font-semibold">{label}</p>
        </div>
        <MailCheck className="size-7 opacity-70" />
      </CardContent>
    </Card>
  );
}

function describeAction(actionType: string, payload: unknown) {
  const record = isRecord(payload) ? payload : {};

  if (actionType === "create_calendar_event") {
    return `Calendar event: ${readString(record.title) ?? "Untitled event"}${readString(record.startTime) ? ` at ${readString(record.startTime)}` : ""}.`;
  }

  if (actionType === "draft_email_reply") {
    return `Gmail draft: ${readString(record.subject) ?? "No subject"}${readString(record.to) ? ` to ${readString(record.to)}` : ""}.`;
  }

  if (actionType === "agent_command") {
    return `Command reviewed: ${readString(record.command) ?? "Natural-language workflow"}.`;
  }

  return "Action recorded for audit and review.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
