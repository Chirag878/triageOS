import OpenAI from "openai";
import { z } from "zod";

import { isDemoModeEnabled } from "@/config/env";
import type { CalendarEventView } from "@/lib/calendar/events";

export type CalendarSummaryInboxSignal = {
  subject: string;
  fromEmail: string;
  priorityLabel: string;
  workflowType: string;
  recommendedAction: string;
  summary: string | null;
  suggestedReply: string | null;
};

export type CalendarSummaryInput = {
  events: CalendarEventView[];
  inboxSignals: CalendarSummaryInboxSignal[];
  now?: Date;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const calendarSummarySchema = z.object({
  headline: z.string().min(1),
  scheduleReadout: z.string().min(1),
  prepFocus: z.array(z.string()).min(1).max(5),
  risks: z.array(z.string()).max(5),
  suggestedActions: z.array(z.string()).min(1).max(5),
  nextBestAction: z.string().min(1),
  approvalNote: z.string().min(1),
  generatedBy: z.enum(["openai", "deterministic", "demo"]).default("openai"),
});

export type CalendarSummary = z.infer<typeof calendarSummarySchema>;

export async function generateCalendarSummary(input: CalendarSummaryInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return buildDeterministicSummary(input, isDemoModeEnabled() ? "demo" : "deterministic");
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the AI calendar analyst for TriageOS.",
            "Summarize the user's calendar using both meeting context and inbox intent.",
            "Never claim an action has been executed.",
            "Recommend reviewable actions that the user can approve later.",
            "Return only valid JSON matching the requested shape.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            now: (input.now ?? new Date()).toISOString(),
            events: input.events.slice(0, 30).map((event) => ({
              title: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
              attendees: event.attendees,
              description: event.description,
              location: event.location,
              status: event.status,
            })),
            inboxSignals: input.inboxSignals.slice(0, 12),
            requiredJsonShape: {
              headline: "one short sentence about the day or week",
              scheduleReadout: "2-3 sentence executive summary",
              prepFocus: ["meeting prep priorities"],
              risks: ["conflicts, missing details, urgent inbox-calendar mismatches"],
              suggestedActions: [
                "reviewable actions such as draft reply, prep notes, create/update event",
              ],
              nextBestAction: "single best user-approved next step",
              approvalNote:
                "one sentence reminding that TriageOS proposes actions and waits for user approval",
              generatedBy: "openai",
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildDeterministicSummary(input, "deterministic");

    return calendarSummarySchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("[calendar-summary] falling back after AI failure", error);
    return buildDeterministicSummary(input, "deterministic");
  }
}

function buildDeterministicSummary(
  input: CalendarSummaryInput,
  generatedBy: CalendarSummary["generatedBy"],
): CalendarSummary {
  const events = [...input.events].sort(
    (a, b) => getTimeValue(a.startTime) - getTimeValue(b.startTime),
  );
  const urgentInbox = input.inboxSignals.filter((item) =>
    ["urgent", "high"].includes(item.priorityLabel),
  );
  const meetingInbox = input.inboxSignals.filter((item) =>
    ["meeting_request", "calendar_update"].includes(item.workflowType),
  );

  if (events.length === 0) {
    return {
      headline: "No synced calendar events are ready to analyze yet.",
      scheduleReadout:
        "TriageOS needs calendar events before it can summarize your schedule. Sync Calendar, then it can combine meetings with Gmail intent.",
      prepFocus: [
        urgentInbox[0]
          ? `Review ${urgentInbox[0].subject} before planning the day.`
          : "Sync Calendar to unlock meeting-aware planning.",
      ],
      risks: meetingInbox.length
        ? [`${meetingInbox.length} inbox item${meetingInbox.length === 1 ? "" : "s"} may need calendar follow-up.`]
        : [],
      suggestedActions: [
        "Sync Calendar.",
        urgentInbox[0] ? `Review ${urgentInbox[0].subject}.` : "Sync Gmail for inbox context.",
      ],
      nextBestAction: "Sync Calendar so TriageOS can build a meeting-aware plan.",
      approvalNote:
        "TriageOS will only execute drafts or calendar changes after you approve them.",
      generatedBy,
    };
  }

  const nextEvent = events[0];
  const externalMeetings = events.filter((event) => event.attendees.length > 0);
  const busiest = busiestDay(events);
  const inboxContext = urgentInbox[0] ?? meetingInbox[0];

  return {
    headline: `${events.length} upcoming calendar item${events.length === 1 ? "" : "s"} need ${externalMeetings.length} meeting-aware prep pass${externalMeetings.length === 1 ? "" : "es"}.`,
    scheduleReadout: `Next up is ${nextEvent.title} at ${formatTime(nextEvent.startTime)}. ${externalMeetings.length} event${externalMeetings.length === 1 ? "" : "s"} include attendees, and ${busiest.label} is the densest schedule block.`,
    prepFocus: [
      `Prepare notes for ${nextEvent.title}.`,
      externalMeetings[0]
        ? `Check attendee context for ${externalMeetings[0].title}.`
        : "Keep the schedule open for focused execution.",
      inboxContext
        ? `Connect inbox signal: ${inboxContext.subject}.`
        : "Run Gmail sync to add inbox intent to this calendar plan.",
    ],
    risks: [
      ...(busiest.count >= 3
        ? [`${busiest.label} has ${busiest.count} events and may need buffers.`]
        : []),
      ...(urgentInbox.length
        ? [`${urgentInbox.length} high-priority inbox item${urgentInbox.length === 1 ? "" : "s"} may affect meeting prep.`]
        : []),
      ...events
        .filter((event) => event.attendees.length > 0 && !event.description)
        .slice(0, 1)
        .map((event) => `${event.title} has attendees but no visible agenda.`),
    ],
    suggestedActions: [
      `Draft prep notes for ${nextEvent.title}.`,
      inboxContext
        ? `Review and approve the Gmail action for ${inboxContext.subject}.`
        : "Sync Gmail to let TriageOS match meeting asks to calendar time.",
      "Approve any draft or event changes from the Gmail workflow card before execution.",
    ],
    nextBestAction: inboxContext
      ? `Review ${inboxContext.subject} and approve the recommended workflow if it matches your intent.`
      : `Open ${nextEvent.title} and capture the decision or agenda before it starts.`,
    approvalNote:
      "TriageOS proposes calendar and Gmail actions here; execution still waits for your approval.",
    generatedBy,
  };
}

function busiestDay(events: CalendarEventView[]) {
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    const key = event.startTime?.slice(0, 10) ?? "unscheduled";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const [key = "unscheduled", count = 0] =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];

  return {
    count,
    label:
      key === "unscheduled"
        ? "unscheduled time"
        : new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${key}T00:00:00.000Z`)),
  };
}

function getTimeValue(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function formatTime(value: string | null) {
  if (!value) return "an unscheduled time";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
