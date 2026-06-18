import { desc, eq, sql } from "drizzle-orm";

import { isDemoModeEnabled } from "@/config/env";
import { db } from "@/db/client";
import { corsairConnections, triageItems } from "@/db/schema";
import { fetchRecentGmailMessages } from "@/lib/corsair/gmail";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";
import { getDemoGmailMessages } from "@/lib/demo/data";

export async function listTriageItems(userId: string) {
  return db
    .select()
    .from(triageItems)
    .where(eq(triageItems.userId, userId))
    .orderBy(desc(triageItems.receivedAt))
    .limit(50);
}

export async function syncRecentGmailToTriage(input: {
  userId: string;
  maxResults?: number;
}) {
  const connection = await getOrCreateCorsairConnection(input.userId);
  const messages = await fetchRecentGmailMessages({
    tenantId: connection.corsairAccountId,
    maxResults: input.maxResults,
  }).catch((error) => {
    if (!isDemoModeEnabled()) throw error;
    return getDemoGmailMessages(input.maxResults);
  });

  await db
    .update(corsairConnections)
    .set({
      gmailConnected: true,
      lastGmailSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(corsairConnections.userId, input.userId));

  if (messages.length === 0) {
    return { imported: 0, items: await listTriageItems(input.userId) };
  }

  await db
    .insert(triageItems)
    .values(
      messages.map((message) => ({
        userId: input.userId,
        provider: "gmail" as const,
        externalMessageId: message.id,
        externalThreadId: message.threadId,
        fromEmail: message.fromEmail,
        toEmails: message.toEmails,
        ccEmails: message.ccEmails,
        subject: message.subject,
        snippet: message.snippet,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
        workflowType: inferWorkflowType(message.subject, message.snippet),
        recommendedAction: inferRecommendedAction(
          message.subject,
          message.snippet,
        ),
        priorityLabel: inferPriorityLabel(message.subject, message.snippet),
        priorityScore: inferPriorityScore(message.subject, message.snippet),
        summary: buildInitialSummary(message.subject, message.snippet),
        intentTimeline: [
          "Imported from Gmail via Corsair",
          "Extracted sender, subject, snippet, and received time",
          "Queued for AI Workflow Card generation",
        ],
        memoryHint:
          "Next step: run AI triage to generate reply and calendar actions.",
        externalUrl: message.externalUrl,
        contentHash: message.contentHash,
        status: "ready" as const,
      })),
    )
    .onConflictDoUpdate({
      target: [
        triageItems.userId,
        triageItems.provider,
        triageItems.externalMessageId,
      ],
      set: {
        externalThreadId: sql`excluded.external_thread_id`,
        fromEmail: sql`excluded.from_email`,
        toEmails: sql`excluded.to_emails`,
        ccEmails: sql`excluded.cc_emails`,
        subject: sql`excluded.subject`,
        snippet: sql`excluded.snippet`,
        bodyPreview: sql`excluded.body_preview`,
        receivedAt: sql`excluded.received_at`,
        contentHash: sql`excluded.content_hash`,
        updatedAt: new Date(),
      },
    });

  return {
    imported: messages.length,
    items: await listTriageItems(input.userId),
  };
}

function inferWorkflowType(subject: string, snippet: string) {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (/meet|meeting|sync|calendar|invite|schedule|availability/.test(text)) {
    return "meeting_request" as const;
  }

  if (/follow up|following up|checking in/.test(text)) {
    return "follow_up" as const;
  }

  if (/newsletter|unsubscribe|digest/.test(text)) {
    return "newsletter" as const;
  }

  if (/\?|please|can you|could you|reply/.test(text)) {
    return "needs_reply" as const;
  }

  return "unknown" as const;
}

function inferRecommendedAction(subject: string, snippet: string) {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (/meet|meeting|sync|calendar|invite|schedule|availability/.test(text)) {
    return "schedule_and_reply" as const;
  }

  if (/\?|please|can you|could you|reply/.test(text)) {
    return "draft_reply" as const;
  }

  return "review" as const;
}

function inferPriorityLabel(subject: string, snippet: string) {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (/urgent|asap|today|blocked|deadline/.test(text)) return "urgent" as const;
  if (/important|tomorrow|meeting|schedule|reply/.test(text))
    return "high" as const;
  if (/newsletter|unsubscribe|digest|promo/.test(text)) return "low" as const;

  return "normal" as const;
}

function inferPriorityScore(subject: string, snippet: string) {
  const label = inferPriorityLabel(subject, snippet);
  if (label === "urgent") return 9;
  if (label === "high") return 7;
  if (label === "low") return 2;
  return 5;
}

function buildInitialSummary(subject: string, snippet: string) {
  const text = snippet || subject;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
