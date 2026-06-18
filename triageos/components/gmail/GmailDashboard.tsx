"use client";

import { useState, useTransition } from "react";
import { Inbox, Loader2, MailCheck, PlugZap, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GmailItem = {
  id: string;
  fromEmail: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  status: string;
};

type ApiResponse = { items?: GmailItem[]; imported?: number; error?: string };

export function GmailDashboard({
  initialConnected,
  initialItems,
}: {
  initialConnected: boolean;
  initialItems: GmailItem[];
}) {
  const [isConnected] = useState(initialConnected);
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectCorsair = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const response = await fetch("/api/corsair/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/gmail" }),
      });
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

  const syncGmail = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const response = await fetch("/api/triage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 25 }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Unable to sync Gmail.");
        return;
      }

      setItems(payload.items ?? []);
      setMessage(
        `Synced ${payload.imported ?? 0} Gmail message${payload.imported === 1 ? "" : "s"}.`,
      );
    });
  };

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <MailCheck className="mr-1.5 size-3.5" /> Gmail via Corsair
          </Badge>
          <CardTitle className="mt-4 text-3xl font-black tracking-tight">
            Gmail sync room
          </CardTitle>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep Gmail ingestion separate from AI and Calendar so the workflow
            is easier to debug.
          </p>
        </div>
        <Button
          onClick={isConnected ? syncGmail : connectCorsair}
          disabled={isPending}
          className="rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
        >
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : isConnected ? (
            <RefreshCw className="mr-2 size-4" />
          ) : (
            <PlugZap className="mr-2 size-4" />
          )}
          {isConnected ? "Sync Gmail" : "Connect Gmail"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {!isConnected ? (
          <div className="rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
            <PlugZap className="mx-auto size-10 text-emerald-700" />
            <h3 className="mt-4 text-xl font-black tracking-tight">
              Connect Gmail to start syncing
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Corsair handles OAuth. Once Gmail is connected, this page will
              show the Sync Gmail action instead.
            </p>
            <Button
              onClick={connectCorsair}
              disabled={isPending}
              className="mt-5 rounded-full bg-emerald-700 text-white hover:bg-emerald-600"
            >
              <PlugZap className="mr-2 size-4" /> Connect Gmail + Calendar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Inbox className="mx-auto size-10 text-slate-400" />
            <h3 className="mt-4 text-xl font-black tracking-tight">
              No Gmail messages loaded
            </h3>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black tracking-tight">
                      {item.subject}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      From {item.fromEmail}
                    </p>
                    <p className="mt-2 line-clamp-1 text-sm text-slate-600">
                      {item.snippet}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit rounded-full capitalize"
                  >
                    {item.status}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
