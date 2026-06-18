import OpenAI from "openai";

import { isDemoModeEnabled } from "@/config/env";
import { aiTriageOutputSchema, type AiTriageOutput } from "@/lib/ai/schemas";
import { generateDemoAiWorkflowCard } from "@/lib/demo/data";

type PlannerInput = {
  fromEmail: string;
  toEmails: string[];
  subject: string;
  snippet: string;
  bodyPreview: string | null;
  receivedAt: Date;
};

const DEFAULT_MODEL = "gpt-4o-mini";

export async function generateAiWorkflowCard(input: PlannerInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (isDemoModeEnabled()) {
      return generateDemoAiWorkflowCard(input);
    }

    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local before generating AI cards.",
    );
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are the AI workflow planner for TriageOS.",
          "Turn one Gmail message into a reviewable workflow card.",
          "Return only valid JSON. Do not execute actions.",
          "If the email asks for a meeting, propose a calendar action and a concise friendly reply.",
          "If details are missing, set calendar fields to null and recommend review or draft_reply.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          now: new Date().toISOString(),
          message: {
            fromEmail: input.fromEmail,
            toEmails: input.toEmails,
            subject: input.subject,
            snippet: input.snippet,
            bodyPreview: input.bodyPreview,
            receivedAt: input.receivedAt.toISOString(),
          },
          requiredJsonShape: {
            workflowType:
              "meeting_request | needs_reply | follow_up | calendar_update | fyi | newsletter | unknown",
            priorityLabel: "low | normal | high | urgent",
            priorityScore: "integer 1-10",
            summary: "one-sentence decision summary",
            recommendedAction:
              "schedule_and_reply | draft_reply | create_event | mark_done | review | none",
            suggestedReply: "string or null",
            suggestedCalendarAction: {
              type: "create_event | update_event | none",
              title: "string or null",
              attendees: ["email strings"],
              startTime: "ISO datetime or null",
              durationMinutes: "integer minutes or null",
              timezone: "IANA timezone or null",
              description: "string or null",
            },
            autopilotScore: {
              confidence: "0-1",
              estimatedMinutesSaved: "integer 0-60",
              reasoning: "short reason",
            },
            intentTimeline: ["2-6 transparent reasoning steps"],
            changeSummary: "string or null",
            memoryHint: "string or null",
          },
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty AI workflow card.");
  }

  return parseAiWorkflowCard(content);
}

function parseAiWorkflowCard(content: string): AiTriageOutput {
  const parsed = JSON.parse(content) as unknown;
  return aiTriageOutputSchema.parse(coerceAiWorkflowCardNumbers(parsed));
}

function coerceAiWorkflowCardNumbers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return {
    ...record,
    priorityScore: coerceNumber(record.priorityScore),
    suggestedCalendarAction: coerceCalendarActionNumbers(
      record.suggestedCalendarAction,
    ),
    autopilotScore: coerceAutopilotScoreNumbers(record.autopilotScore),
  };
}

function coerceCalendarActionNumbers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return {
    ...record,
    durationMinutes: coerceNumber(record.durationMinutes),
  };
}

function coerceAutopilotScoreNumbers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return {
    ...record,
    confidence: coerceNumber(record.confidence),
    estimatedMinutesSaved: coerceNumber(record.estimatedMinutesSaved),
  };
}

function coerceNumber(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}
