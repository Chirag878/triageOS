"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SUMMARY_PROMPTS = [
  "Protect deep-work blocks around your busiest meeting day.",
  "Batch lighter calls together so context switching stays low.",
  "Prep agenda notes before external attendee meetings.",
];

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

type CalendarDay = {
  date: Date;
  key: string;
  label: number;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
};

export function CalendarDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          getTimeValue(a.startTime) - getTimeValue(b.startTime) ||
          a.title.localeCompare(b.title),
      ),
    [events],
  );

  const calendarModel = useMemo(
    () => buildCalendarModel(sortedEvents),
    [sortedEvents],
  );
  const selectedDay = useMemo(
    () =>
      calendarModel.days.find((day) => day.key === selectedDateKey) ??
      calendarModel.days.find((day) => day.events.length > 0) ??
      null,
    [calendarModel.days, selectedDateKey],
  );
  const busyDay = useMemo(
    () =>
      [...calendarModel.days].sort(
        (a, b) => b.events.length - a.events.length,
      )[0],
    [calendarModel.days],
  );

  const syncCalendar = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      setSummary(null);

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

      const nextEvents = payload.events ?? [];
      setEvents(nextEvents);
      setSelectedDateKey(firstEventDateKey(nextEvents));
      setMessage(
        `Synced ${payload.count ?? 0} event${payload.count === 1 ? "" : "s"} via ${payload.operationPath ?? "Corsair"}.`,
      );
    });
  };

  const createCalendarSummary = () => {
    if (sortedEvents.length === 0) {
      setSummary(
        "Sync your calendar first, then TriageOS can summarize your upcoming schedule.",
      );
      return;
    }

    const externalMeetings = sortedEvents.filter(
      (event) => event.attendees.length > 0,
    ).length;
    const nextEvent = sortedEvents[0];
    const busiestLabel = busyDay
      ? formatDayHeading(busyDay.date)
      : "your busiest day";
    const recommendation =
      SUMMARY_PROMPTS[sortedEvents.length % SUMMARY_PROMPTS.length];

    setSummary(
      `You have ${sortedEvents.length} upcoming events in ${calendarModel.monthLabel}. ${externalMeetings} include attendees. Next up: “${nextEvent.title}” at ${formatTime(nextEvent.startTime)}. Busiest day: ${busiestLabel}. ${recommendation}`,
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/85 shadow-sm backdrop-blur-xl">
        <CardHeader className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute right-8 top-6 size-32 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 size-28 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">
                <CalendarDays className="mr-1.5 size-3.5" /> Google Calendar via
                Corsair
              </Badge>
              <CardTitle className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Calendar cockpit
              </CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                A real month-style calendar for upcoming meetings, with a side
                panel that turns events into a quick planning summary.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={createCalendarSummary}
                variant="outline"
                className="rounded-full border-blue-200 bg-white/80"
              >
                <Sparkles className="mr-2 size-4" /> Get summary
              </Button>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6 pt-0 md:p-8 md:pt-0">
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
          {summary ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-black text-emerald-950">
                <Sparkles className="size-4" /> Calendar summary
              </div>
              {summary}
            </div>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-3 shadow-inner md:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                    Month view
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {calendarModel.monthLabel}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                    {sortedEvents.length} events
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                    {countAttendees(sortedEvents)} attendees
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="py-2">
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarModel.days.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDateKey(day.key)}
                    className={`min-h-24 rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      selectedDay?.key === day.key
                        ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-900/5"
                        : day.isCurrentMonth
                          ? "border-white bg-white"
                          : "border-slate-100 bg-white/50 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{day.label}</span>
                      {day.events.length ? (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                          {day.events.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {day.events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="truncate rounded-lg bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-900"
                        >
                          {formatTime(event.startTime)} · {event.title}
                        </div>
                      ))}
                      {day.events.length > 2 ? (
                        <div className="px-2 text-[11px] font-bold text-slate-500">
                          +{day.events.length - 2} more
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <aside className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Day summary
                  </p>
                  <h3 className="mt-1 text-xl font-black tracking-tight">
                    {selectedDay
                      ? formatDayHeading(selectedDay.date)
                      : "No day selected"}
                  </h3>
                </div>
                <CalendarCheck2 className="size-8 text-blue-600" />
              </div>

              {selectedDay?.events.length ? (
                <div className="space-y-3">
                  {selectedDay.events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <h4 className="font-black tracking-tight">
                        {event.title}
                      </h4>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <Clock3 className="size-4" />{" "}
                        {formatTime(event.startTime)} →{" "}
                        {formatTime(event.endTime)}
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <Users className="mt-1 size-4 shrink-0" />
                        {event.attendees.length
                          ? event.attendees.join(", ")
                          : "No attendees"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <CalendarDays className="mx-auto size-8 text-slate-400" />
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {events.length === 0
                      ? "Sync Calendar to load your upcoming events."
                      : "No events on this day. Pick a blue day to inspect meetings."}
                  </p>
                </div>
              )}
            </aside>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function buildCalendarModel(events: CalendarEvent[]) {
  const anchor = events.find((event) => event.startTime)?.startTime
    ? new Date(events.find((event) => event.startTime)?.startTime as string)
    : new Date("2026-06-01T00:00:00.000Z");
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const start = new Date(firstDay);
  start.setUTCDate(firstDay.getUTCDate() - firstDay.getUTCDay());

  const eventsByDay = events.reduce<Record<string, CalendarEvent[]>>(
    (acc, event) => {
      const key = toDateKey(event.startTime);
      if (!key) return acc;
      acc[key] = [...(acc[key] ?? []), event];
      return acc;
    },
    {},
  );

  const days: CalendarDay[] = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = toDateKey(date.toISOString()) ?? "";
    return {
      date,
      key,
      label: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month,
      events: eventsByDay[key] ?? [],
    };
  });

  return {
    days,
    monthLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(firstDay),
  };
}

function firstEventDateKey(events: CalendarEvent[]) {
  return events.find((event) => event.startTime)?.startTime
    ? toDateKey(events.find((event) => event.startTime)?.startTime ?? null)
    : null;
}

function countAttendees(events: CalendarEvent[]) {
  return events.reduce((total, event) => total + event.attendees.length, 0);
}

function getTimeValue(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function toDateKey(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatDayHeading(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
