import OpenAI from "openai";
import { z } from "zod";

import type { CalendarEventView } from "@/lib/calendar/events";
import type { CalendarSummaryInboxSignal } from "@/lib/ai/calendar-summary";

export type AgentPlan = {
  title: string;
  steps: string[];
  safety: string;
  draft?: {
    to: string;
    subject: string;
    body: string;
  };
  calendarEvent?: {
    title: string;
    attendees: string[];
    startTime: string;
    durationMinutes: number;
    timezone: string;
    description: string;
    reminderMinutes: number;
  };
};

export type CommandParserInput = {
  command: string;
  calendarEvents: CalendarEventView[];
  inboxSignals: CalendarSummaryInboxSignal[];
  now?: Date;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const agentPlanSchema: z.ZodType<AgentPlan> = z.object({
  title: z.string().min(1).max(80),
  steps: z.array(z.string().min(1)).min(1).max(8),
  safety: z.string().min(1),
  draft: z
    .object({
      to: z.string().email(),
      subject: z.string().min(1).max(160),
      body: z.string().min(1).max(4000),
    })
    .optional(),
  calendarEvent: z
    .object({
      title: z.string().min(1).max(160),
      attendees: z.array(z.string().email()).default([]),
      startTime: z.string().datetime(),
      durationMinutes: z.number().int().min(5).max(240),
      timezone: z.string().min(1).default("UTC"),
      description: z.string().max(2000),
      reminderMinutes: z.number().int().min(0).max(1440).default(10),
    })
    .optional(),
});

export async function buildCommandPlan(input: CommandParserInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallbackPlan(input.command);

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the AI command parser for TriageOS.",
            "Convert one natural-language command into a safe reviewable Gmail/Calendar plan.",
            "Use provided inbox and calendar context where helpful.",
            "Never send an email. Draft only.",
            "Never execute anything. The product will require explicit user confirmation after this plan.",
            "If a required recipient or time is missing, omit that executable action and explain the missing detail in steps.",
            "Return only valid JSON matching the requested shape.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            now: (input.now ?? new Date()).toISOString(),
            command: input.command,
            upcomingCalendarEvents: input.calendarEvents.slice(0, 12),
            inboxSignals: input.inboxSignals.slice(0, 12),
            requiredJsonShape: {
              title: "short plan title",
              steps: [
                "transparent reasoning and proposed action steps before confirmation",
              ],
              safety:
                "one sentence explaining drafts/events are only created after user confirmation",
              draft: {
                to: "recipient email, only when explicit or strongly present in context",
                subject: "draft subject",
                body: "reviewable draft body",
              },
              calendarEvent: {
                title: "event title",
                attendees: ["email strings"],
                startTime: "ISO datetime",
                durationMinutes: "integer 5-240",
                timezone: "UTC unless command clearly specifies another timezone",
                description: "include command and relevant context",
                reminderMinutes: 10,
              },
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildFallbackPlan(input.command);

    return agentPlanSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("[command-parser] falling back after AI failure", error);
    return buildFallbackPlan(input.command);
  }
}

function buildFallbackPlan(command: string): AgentPlan {
  const lower = command.toLowerCase();
  const emails = extractEmails(command);
  const shouldSchedule = includesAny(lower, [
    "schedule",
    "meeting",
    "calendar",
    "sync",
    "call",
  ]);
  const shouldDraft = includesAny(lower, [
    "email",
    "reply",
    "send",
    "draft",
    "message",
    "confirm",
  ]);
  const startTime = inferStartTime(lower);
  const durationMinutes = inferDuration(lower);
  const title = inferEventTitle(command, lower);
  const firstEmail = emails[0];

  const plan: AgentPlan = {
    title: inferPlanTitle(lower),
    steps: [
      "Read the command and identify the intended Gmail/Calendar workflow.",
    ],
    safety:
      "No email is sent automatically. TriageOS only creates drafts and calendar events after this confirmation.",
  };

  if (shouldSchedule) {
    plan.calendarEvent = {
      title,
      attendees: emails,
      startTime,
      durationMinutes,
      timezone: "UTC",
      description: `Created from TriageOS command: ${command}`,
      reminderMinutes: 10,
    };
    plan.steps.push(
      `Create a Google Calendar event "${title}" at ${formatPlanTime(startTime)} with a 10 minute reminder.`,
    );
  }

  if (shouldDraft && firstEmail) {
    plan.draft = {
      to: firstEmail,
      subject: shouldSchedule ? `Confirming ${title}` : "Following up",
      body: buildDraftBody(command, title, startTime, shouldSchedule),
    };
    plan.steps.push(`Create a Gmail draft to ${firstEmail} for review.`);
  }

  if (shouldDraft && !firstEmail) {
    plan.steps.push(
      "No recipient email was found, so TriageOS will not create a Gmail draft until an email address is included.",
    );
  }

  if (!plan.calendarEvent && !plan.draft) {
    plan.steps.push(
      "No executable Gmail or Calendar action was detected, so TriageOS will only log this reviewed command.",
    );
  }

  plan.steps.push(
    "Show this plan and require explicit confirmation before any external action.",
  );

  return plan;
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function extractEmails(command: string) {
  return Array.from(
    new Set(
      command
        .match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)
        ?.map((email) => email.toLowerCase()) ?? [],
    ),
  );
}

function inferStartTime(command: string) {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0),
  );

  if (command.includes("tomorrow")) date.setUTCDate(date.getUTCDate() + 1);
  else if (command.includes("next thursday")) moveToNextWeekday(date, 4);
  else if (command.includes("next friday")) moveToNextWeekday(date, 5);
  else if (command.includes("next monday")) moveToNextWeekday(date, 1);
  else date.setUTCDate(date.getUTCDate() + 1);

  const explicitHour = command.match(
    /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i,
  );
  if (explicitHour) {
    const rawHour = Number(explicitHour[1]);
    const minute = explicitHour[2] ? Number(explicitHour[2]) : 0;
    const meridiem = explicitHour[3]?.toLowerCase();
    const hour =
      meridiem === "pm" && rawHour !== 12
        ? rawHour + 12
        : meridiem === "am" && rawHour === 12
          ? 0
          : rawHour;
    date.setUTCHours(hour, minute, 0, 0);
  } else if (command.includes("afternoon")) {
    date.setUTCHours(14, 0, 0, 0);
  } else if (command.includes("evening")) {
    date.setUTCHours(17, 0, 0, 0);
  } else if (command.includes("morning")) {
    date.setUTCHours(9, 0, 0, 0);
  }

  return date.toISOString();
}

function moveToNextWeekday(date: Date, weekday: number) {
  const current = date.getUTCDay();
  const delta = (weekday - current + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + delta);
}

function inferDuration(command: string) {
  const minutes = command.match(/(\d{2,3})\s*(min|minute|minutes)/i);
  if (minutes) return Math.min(Math.max(Number(minutes[1]), 5), 240);
  const hours = command.match(/(\d)\s*(hour|hours)/i);
  if (hours) return Math.min(Math.max(Number(hours[1]) * 60, 15), 240);
  return 30;
}

function inferEventTitle(command: string, lower: string) {
  if (lower.includes("sync")) return "Sync meeting";
  if (lower.includes("interview")) return "Interview";
  if (lower.includes("demo")) return "Demo meeting";
  if (lower.includes("call")) return "Call";
  const cleaned = command
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .trim();
  return cleaned.slice(0, 60) || "TriageOS meeting";
}

function buildDraftBody(
  command: string,
  title: string,
  startTime: string,
  includesCalendarEvent: boolean,
) {
  if (!includesCalendarEvent) {
    return `Hi,\n\nThanks for reaching out. I drafted this from TriageOS and will review it before sending.\n\nContext: ${command}\n\nBest,`;
  }

  return `Hi,\n\nConfirming ${title.toLowerCase()} for ${formatPlanTime(startTime)}. I have added a calendar invite with a reminder.\n\nBest,`;
}

function inferPlanTitle(command: string) {
  if (command.includes("schedule") || command.includes("meeting"))
    return "Schedule and draft";
  if (command.includes("reply") || command.includes("email"))
    return "Draft email response";
  return "Plan workflow command";
}

function formatPlanTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
