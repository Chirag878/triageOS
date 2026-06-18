"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarCheck,
  Loader2,
  MailCheck,
  PlugZap,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusPayload = {
  tenantId: string;
  gmailConnected: boolean;
  calendarConnected: boolean;
  error?: string;
};

export function CorsairConnectionStatus() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadStatus = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/corsair/status", {
        cache: "no-store",
      });
      const payload = (await response.json()) as StatusPayload;

      if (!response.ok) {
        setError(payload.error ?? "Unable to load Corsair status.");
        return;
      }

      setStatus(payload);
    });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const connect = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/corsair/connect", { method: "POST" });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to create Corsair connect link.");
        return;
      }

      window.location.href = payload.url;
    });
  };

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
      <CardHeader className="p-7 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-black tracking-tight">
              Connected via Corsair
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Corsair handles Gmail and Google Calendar OAuth. TriageOS only
              stores connection references.
            </p>
          </div>
          <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Tenant {status?.tenantId ? "ready" : "pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-7 pt-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <ConnectionTile
            icon={MailCheck}
            label="Gmail"
            connected={status?.gmailConnected ?? false}
          />
          <ConnectionTile
            icon={CalendarCheck}
            label="Google Calendar"
            connected={status?.calendarConnected ?? false}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            disabled={isPending}
            onClick={connect}
            className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-800"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <PlugZap className="mr-2 size-4" />
            )}
            Connect Gmail + Calendar
          </Button>
          <Button
            disabled={isPending}
            onClick={loadStatus}
            variant="outline"
            className="h-12 rounded-2xl bg-white/70"
          >
            <RefreshCw className="mr-2 size-4" /> Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionTile({
  icon: Icon,
  label,
  connected,
}: {
  icon: LucideIcon;
  label: string;
  connected: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
      <Icon
        className={
          connected ? "size-8 text-emerald-700" : "size-8 text-slate-400"
        }
      />
      <p className="mt-4 font-bold">{label}</p>
      <p
        className={
          connected ? "text-sm text-emerald-700" : "text-sm text-slate-500"
        }
      >
        {connected ? "Connected" : "Not connected yet"}
      </p>
    </div>
  );
}
