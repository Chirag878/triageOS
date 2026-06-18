import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { actionLogs } from "@/db/schema";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import {
  calendarEventWriteFromCreateResult,
  listCalendarEvents,
  saveCalendarEvent,
} from "@/lib/calendar/events";
import { createCalendarEvent } from "@/lib/corsair/calendar";
import { createGmailDraftReply } from "@/lib/corsair/gmail-actions";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";
import { buildCommandPlan, type AgentPlan } from "@/lib/ai/command-parser";
import { listTriageItems } from "@/lib/triage/gmail-ingestion";

type JsonRecord = Record<string, unknown>;

const agentSchema = z.object({
  command: z.string().trim().min(3).max(500),
  confirmed: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = agentSchema.parse(body);
    const [calendarEvents, triageItems] = await Promise.all([
      listCalendarEvents(profile.id),
      listTriageItems(profile.id),
    ]);
    const plan = await buildCommandPlan({
      command: input.command,
      calendarEvents,
      inboxSignals: triageItems.map((item) => ({
        subject: item.subject,
        fromEmail: item.fromEmail,
        priorityLabel: item.priorityLabel,
        workflowType: item.workflowType,
        recommendedAction: item.recommendedAction,
        summary: item.summary,
        suggestedReply: item.suggestedReply,
      })),
    });

    if (!input.confirmed) {
      return NextResponse.json({ plan, requiresConfirmation: true });
    }

    const previous = await findPreviousAgentCommand(profile.id, input.command);
    if (previous) {
      return NextResponse.json({
        plan: readPlan(previous.actionPayload) ?? plan,
        requiresConfirmation: false,
        result:
          readResultMessage(previous.result) ??
          "Command already executed. Showing the existing result.",
        executed: readExecuted(previous.result),
        idempotent: true,
      });
    }

    const connection = await getOrCreateCorsairConnection(profile.id);
    const executed: JsonRecord = {};

    if (plan.calendarEvent) {
      const calendarResult = await createCalendarEvent({
        tenantId: connection.corsairAccountId,
        ...plan.calendarEvent,
      });
      executed.calendar = calendarResult;
      executed.persistedCalendarEvent = await saveCalendarEvent(
        calendarEventWriteFromCreateResult({
          userId: profile.id,
          source: "agent",
          calendarInput: {
            tenantId: connection.corsairAccountId,
            ...plan.calendarEvent,
          },
          result: calendarResult,
        }),
      );

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
    return apiErrorResponse(error, "Failed to plan agent command.");
  }
}

async function findPreviousAgentCommand(userId: string, command: string) {
  const recent = await db
    .select()
    .from(actionLogs)
    .where(
      and(
        eq(actionLogs.userId, userId),
        eq(actionLogs.actionType, "agent_command"),
        eq(actionLogs.status, "succeeded"),
      ),
    )
    .orderBy(desc(actionLogs.createdAt))
    .limit(25);

  return recent.find((log) => readCommand(log.actionPayload) === command);
}

function readCommand(value: unknown) {
  if (!isRecord(value)) return null;
  return typeof value.command === "string" ? value.command : null;
}

function readPlan(value: unknown): AgentPlan | null {
  if (!isRecord(value)) return null;
  return isRecord(value.plan) ? (value.plan as AgentPlan) : null;
}

function readResultMessage(value: unknown) {
  if (!isRecord(value)) return null;
  return typeof value.message === "string" ? value.message : null;
}

function readExecuted(value: unknown) {
  if (!isRecord(value)) return {};
  return isRecord(value.executed) ? value.executed : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildResultMessage(plan: AgentPlan) {
  const actions = [];
  if (plan.calendarEvent) actions.push("created a Calendar event");
  if (plan.draft) actions.push("created a Gmail draft");
  if (actions.length === 0)
    return "Command reviewed and logged. No external action was needed.";
  return `Done - ${actions.join(" and ")}. Review the result before sending anything.`;
}
