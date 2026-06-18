import OpenAI from "openai";
import { z } from "zod";

import type { CalendarSummaryInboxSignal } from "@/lib/ai/calendar-summary";

export type FollowUpDetectionInput = {
  inboxSignals: CalendarSummaryInboxSignal[];
  now?: Date;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const followUpCandidateSchema = z.object({
  subject: z.string().min(1),
  reason: z.string().min(1),
  urgency: z.enum(["low", "normal", "high", "urgent"]),
  suggestedAction: z.string().min(1),
  approvalNote: z.string().min(1),
});

const followUpDetectionSchema = z.object({
  candidates: z.array(followUpCandidateSchema).max(8),
  generatedBy: z.enum(["openai", "deterministic"]).default("openai"),
});

export type FollowUpDetection = z.infer<typeof followUpDetectionSchema>;

export async function detectFollowUps(input: FollowUpDetectionInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallbackDetection(input);

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
            "You are the Follow-Up Detection AI for TriageOS.",
            "Find Gmail items that likely need a follow-up, reply, or scheduling nudge.",
            "Use only the provided triage context.",
            "Suggest actions for user review. Never claim anything has been sent or scheduled.",
            "Return only valid JSON matching the requested shape.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            now: (input.now ?? new Date()).toISOString(),
            inboxSignals: input.inboxSignals.slice(0, 30),
            requiredJsonShape: {
              candidates: [
                {
                  subject: "source email subject",
                  reason: "why this needs follow-up",
                  urgency: "low | normal | high | urgent",
                  suggestedAction: "draft reply, schedule, review, or mark done",
                  approvalNote:
                    "one sentence explaining TriageOS waits for approval",
                },
              ],
              generatedBy: "openai",
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildFallbackDetection(input);

    return followUpDetectionSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("[follow-up-detection] falling back after AI failure", error);
    return buildFallbackDetection(input);
  }
}

function buildFallbackDetection(input: FollowUpDetectionInput): FollowUpDetection {
  const candidates = input.inboxSignals
    .filter((item) => {
      const haystack = `${item.subject} ${item.summary ?? ""}`.toLowerCase();
      return (
        item.workflowType === "follow_up" ||
        item.recommendedAction === "draft_reply" ||
        item.recommendedAction === "schedule_and_reply" ||
        haystack.includes("follow up") ||
        haystack.includes("checking in") ||
        haystack.includes("waiting") ||
        haystack.includes("reminder")
      );
    })
    .slice(0, 6)
    .map((item) => ({
      subject: item.subject,
      reason:
        item.summary ??
        "This message appears to need a reply, scheduling nudge, or explicit review.",
      urgency: normalizeUrgency(item.priorityLabel),
      suggestedAction: item.suggestedReply
        ? "Review the AI draft and approve the follow-up bundle if it matches your intent."
        : "Generate an AI workflow card, then approve the suggested follow-up.",
      approvalNote:
        "TriageOS can draft the follow-up, but it waits for your approval before creating anything.",
    }));

  return { candidates, generatedBy: "deterministic" };
}

function normalizeUrgency(value: string) {
  if (["low", "normal", "high", "urgent"].includes(value)) {
    return value as "low" | "normal" | "high" | "urgent";
  }

  return "normal";
}
