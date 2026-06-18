import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { actionLogs, triageItems } from "@/db/schema";
import {
  calendarEventWriteFromCreateResult,
  saveCalendarEvent,
} from "@/lib/calendar/events";
import { createCalendarEvent } from "@/lib/corsair/calendar";
import {
  createGmailDraftReply,
  sendGmailReply,
} from "@/lib/corsair/gmail-actions";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

type JsonRecord = Record<string, unknown>;

type SuggestedCalendarAction = {
  type?: string;
  title?: string | null;
  attendees?: string[];
  startTime?: string | null;
  durationMinutes?: number | null;
  timezone?: string | null;
  description?: string | null;
};

export async function executeTriageWorkflow(input: {
  userId: string;
  triageItemId: string;
  draftReply: boolean;
  sendEmail?: boolean;
  createEvent: boolean;
  suggestedReplyOverride?: string | null;
  calendarActionOverride?: SuggestedCalendarAction | null;
}) {
  const [item] = await db
    .select()
    .from(triageItems)
    .where(eq(triageItems.id, input.triageItemId))
    .limit(1);

  if (!item || item.userId !== input.userId) {
    throw new Error("Triage item not found.");
  }

  const existingResults: JsonRecord = {};
  if (item.createdCalendarEventId) {
    existingResults.persistedCalendarEvent = {
      id: item.createdCalendarEventId,
      idempotent: true,
      reason: "Calendar event was already created for this workflow.",
    };
  }
  if (item.draftEmailMessageId) {
    existingResults.draft = {
      id: item.draftEmailMessageId,
      idempotent: true,
      reason: "Gmail draft was already created for this workflow.",
    };
  }
  if (
    item.status === "completed" &&
    (!input.createEvent || item.createdCalendarEventId) &&
    (!input.draftReply || item.draftEmailMessageId) &&
    !input.sendEmail
  ) {
    return { item, results: existingResults, idempotent: true };
  }

  const replyBody = input.suggestedReplyOverride?.trim() || item.suggestedReply;

  if (!replyBody && (input.draftReply || input.sendEmail)) {
    throw new Error(
      "Generate or write an AI suggested reply before saving or sending.",
    );
  }

  const connection = await getOrCreateCorsairConnection(input.userId);
  const results: JsonRecord = { ...existingResults };
  const updates: Partial<typeof triageItems.$inferInsert> = {
    status: "executing",
    updatedAt: new Date(),
  };

  await db.update(triageItems).set(updates).where(eq(triageItems.id, item.id));

  console.info("[execute.workflow] execution mode", {
    triageItemId: item.id,
    userId: input.userId,
    draftReply: input.draftReply,
    sendEmail: Boolean(input.sendEmail),
    createEvent: input.createEvent,
  });

  try {
    if (input.createEvent && !item.createdCalendarEventId) {
      const calendarAction =
        input.calendarActionOverride ??
        (item.suggestedCalendarAction as SuggestedCalendarAction | null);

      if (calendarAction?.type && calendarAction.type !== "none") {
        const payload = normalizeCalendarAction(calendarAction, item.fromEmail);
        await createActionLog({
          userId: input.userId,
          triageItemId: item.id,
          actionType: "create_calendar_event",
          payload,
          status: "running",
        });
        const calendarResult = await createCalendarEvent({
          tenantId: connection.corsairAccountId,
          ...payload,
        });
        const persistedEvent = await saveCalendarEvent(
          calendarEventWriteFromCreateResult({
            userId: input.userId,
            source: "workflow",
            calendarInput: {
              tenantId: connection.corsairAccountId,
              ...payload,
            },
            result: calendarResult,
          }),
        );
        results.calendar = calendarResult;
        results.persistedCalendarEvent = persistedEvent;
        updates.createdCalendarEventId =
          persistedEvent.id ?? extractId(calendarResult);
        await createActionLog({
          userId: input.userId,
          triageItemId: item.id,
          actionType: "create_calendar_event",
          payload,
          status: "succeeded",
          result: calendarResult,
        });
      }
    }

    if (input.draftReply && replyBody && !item.draftEmailMessageId) {
      const to = extractEmail(item.fromEmail);
      const payload = {
        to,
        subject: item.subject,
        body: replyBody,
        threadId: item.externalThreadId,
      };
      await createActionLog({
        userId: input.userId,
        triageItemId: item.id,
        actionType: "draft_email_reply",
        payload,
        status: "running",
      });
      const draftResult = await createGmailDraftReply({
        tenantId: connection.corsairAccountId,
        ...payload,
      });
      results.draft = draftResult;
      updates.draftEmailMessageId = extractId(draftResult);
      await createActionLog({
        userId: input.userId,
        triageItemId: item.id,
        actionType: "draft_email_reply",
        payload,
        status: "succeeded",
        result: draftResult,
      });
    }

    if (input.sendEmail && replyBody) {
      const to = extractEmail(item.fromEmail);
      const payload = {
        to,
        subject: item.subject,
        body: replyBody,
        threadId: item.externalThreadId,
      };
      await createActionLog({
        userId: input.userId,
        triageItemId: item.id,
        actionType: "send_email_reply",
        payload,
        status: "running",
      });
      const sendResult = await sendGmailReply({
        tenantId: connection.corsairAccountId,
        ...payload,
      });
      results.sentEmail = sendResult;
      await createActionLog({
        userId: input.userId,
        triageItemId: item.id,
        actionType: "send_email_reply",
        payload,
        status: "succeeded",
        result: sendResult,
      });
    }

    const reviewedUpdates: Partial<typeof triageItems.$inferInsert> = {};
    if (input.suggestedReplyOverride !== undefined) {
      reviewedUpdates.suggestedReply = replyBody ?? null;
    }
    if (input.calendarActionOverride !== undefined) {
      reviewedUpdates.suggestedCalendarAction =
        input.calendarActionOverride as JsonRecord;
    }

    const [updated] = await db
      .update(triageItems)
      .set({
        ...updates,
        ...reviewedUpdates,
        status: "completed",
        executedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(triageItems.id, item.id))
      .returning();

    return { item: updated, results };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Workflow execution failed.";
    console.error("[execute.workflow] failed", {
      triageItemId: item.id,
      userId: input.userId,
      draftReply: input.draftReply,
      sendEmail: Boolean(input.sendEmail),
      createEvent: input.createEvent,
      message,
      error,
    });
    const [failed] = await db
      .update(triageItems)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(triageItems.id, item.id))
      .returning();

    throw Object.assign(new Error(message), { item: failed });
  }
}

function normalizeCalendarAction(
  action: SuggestedCalendarAction,
  fallbackEmail: string,
) {
  if (!action.title || !action.startTime || !action.durationMinutes) {
    throw new Error(
      "Calendar action is missing title, start time, or duration.",
    );
  }

  return {
    title: action.title,
    attendees: action.attendees?.length
      ? action.attendees
      : [extractEmail(fallbackEmail)],
    startTime: action.startTime,
    durationMinutes: action.durationMinutes,
    timezone: action.timezone ?? "UTC",
    description: action.description ?? null,
  };
}

async function createActionLog(input: {
  userId: string;
  triageItemId: string;
  actionType:
    | "create_calendar_event"
    | "draft_email_reply"
    | "send_email_reply";
  payload: JsonRecord;
  status: "running" | "succeeded" | "failed";
  result?: unknown;
}) {
  await db.insert(actionLogs).values({
    userId: input.userId,
    triageItemId: input.triageItemId,
    actionType: input.actionType,
    actionPayload: input.payload,
    status: input.status,
    result: input.result as JsonRecord | undefined,
  });
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function extractId(value: JsonRecord) {
  const id = value.id ?? value.message?.valueOf();
  return typeof id === "string" ? id : undefined;
}
