import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { triageItems } from "@/db/schema";
import { generateAiWorkflowCard } from "@/lib/ai/planner";
import { requireUser } from "@/lib/auth/session";

const analyzeSchema = z.object({
  triageItemId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = analyzeSchema.parse(body);

    const [item] = await db
      .select()
      .from(triageItems)
      .where(eq(triageItems.id, input.triageItemId))
      .limit(1);

    if (!item || item.userId !== profile.id) {
      return NextResponse.json(
        { error: "Triage item not found." },
        { status: 404 },
      );
    }

    const aiCard = await generateAiWorkflowCard({
      fromEmail: item.fromEmail,
      toEmails: item.toEmails,
      subject: item.subject,
      snippet: item.snippet,
      bodyPreview: item.bodyPreview,
      receivedAt: item.receivedAt,
    });

    const [updated] = await db
      .update(triageItems)
      .set({
        workflowType: aiCard.workflowType,
        priorityLabel: aiCard.priorityLabel,
        priorityScore: aiCard.priorityScore,
        summary: aiCard.summary,
        recommendedAction: aiCard.recommendedAction,
        suggestedReply: aiCard.suggestedReply,
        suggestedCalendarAction: aiCard.suggestedCalendarAction,
        autopilotScore: aiCard.autopilotScore,
        intentTimeline: aiCard.intentTimeline,
        changeSummary: aiCard.changeSummary,
        memoryHint: aiCard.memoryHint,
        aiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        aiGeneratedAt: new Date(),
        aiOutputVersion: "2026-06-17.v1",
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(triageItems.id, item.id))
      .returning();

    return NextResponse.json({ item: updated });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate AI workflow card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
