import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { actionLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { createCalendarEvent } from "@/lib/corsair/calendar";
import { createGmailDraftReply } from "@/lib/corsair/gmail-actions";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

type JsonRecord = Record<string, unknown>;

type AgentPlan = {
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

const agentSchema = z.object({
  command: z.string().trim().min(3).max(500),
  confirmed: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = agentSchema.parse(body);
    const plan = buildAgentPlan(input.command);

    if (!input.confirmed) {
      return NextResponse.json({ plan, requiresConfirmation: true });
    }

    const connection = await getOrCreateCorsairConnection(profile.id);
    const executed: JsonRecord = {};

    if (plan.calendarEvent) {
      const calendarResult = await createCalendarEvent({
        tenantId: connection.corsairAccountId,
        ...plan.calendarEvent,
      });
      executed.calendar = calendarResult;

      await db.insert(actionLogs).values({
        userId: profile.id,
        actionType: "create_calendar_event",
        actionPayload: plan.calendarEvent,
        status: "succeeded",
        result: calendarResult,
      });
    }

    if (plan.draft) {
      const draftResult = await createGmailDraftReply({
        tenantId: connection.corsairAccountId,
        ...plan.draft,
      });
      executed.draft = draftResult;

      await db.insert(actionLogs).values({
        userId: profile.id,
        actionType: "draft_email_reply",
        actionPayload: plan.draft,
        status: "succeeded",
        result: draftResult,
      });
    }

    await db.insert(actionLogs).values({
      userId: profile.id,
      actionType: "agent_command",
      actionPayload: { command: input.command, plan },
      status: "succeeded",
      result: {
        message: buildResultMessage(plan),
        executed,
      },
    });

    return NextResponse.json({
      plan,
      requiresConfirmation: false,
      result: buildResultMessage(plan),
      executed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to plan agent command.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildAgentPlan(command: string): AgentPlan {
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
      `Create a Google Calendar event “${title}” at ${formatPlanTime(startTime)} with a 10 minute reminder.`,
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

function buildResultMessage(plan: AgentPlan) {
  const actions = [];
  if (plan.calendarEvent) actions.push("created a Calendar event");
  if (plan.draft) actions.push("created a Gmail draft");
  if (actions.length === 0)
    return "Command reviewed and logged. No external action was needed.";
  return `Done — ${actions.join(" and ")}. Review the result before sending anything.`;
}
