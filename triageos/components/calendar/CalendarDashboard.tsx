"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Loader2, RefreshCw, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendees: string[];
};

type CalendarSyncResponse = {
  count?: number;
  events?: CalendarEvent[];
  operationPath?: string;
  error?: string;
};

export function CalendarDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const syncCalendar = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 25 }),
      });
      const payload = (await response.json()) as CalendarSyncResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Unable to sync Google Calendar.");
        return;
      }

      setEvents(payload.events ?? []);
      setMessage(
        `Synced ${payload.count ?? 0} event${payload.count === 1 ? "" : "s"} via ${payload.operationPath ?? "Corsair"}.`,
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">
              <CalendarDays className="mr-1.5 size-3.5" /> Google Calendar via
              Corsair
            </Badge>
            <CardTitle className="mt-4 text-3xl font-black tracking-tight">
              Calendar command center
            </CardTitle>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Sync upcoming events into a reviewable calendar outlet before AI
              creates meeting actions.
            </p>
          </div>
          <Button
            onClick={syncCalendar}
            disabled={isPending}
            className="rounded-full bg-blue-700 text-white hover:bg-blue-600"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Sync Calendar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              {message}
            </div>
          ) : null}

          {events.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <CalendarDays className="mx-auto size-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-black tracking-tight">
                No calendar events loaded yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Click Sync Calendar to fetch upcoming events from Google
                Calendar through Corsair.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {event.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {formatDate(event.startTime)} →{" "}
                        {formatDate(event.endTime)}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      Event
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <Users className="size-4" />
                    {event.attendees.length
                      ? event.attendees.join(", ")
                      : "No attendees"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
