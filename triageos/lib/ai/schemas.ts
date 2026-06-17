import { z } from "zod";

export const workflowTypeSchema = z.enum([
  "meeting_request",
  "needs_reply",
  "follow_up",
  "calendar_update",
  "fyi",
  "newsletter",
  "unknown",
]);

export const recommendedActionSchema = z.enum([
  "schedule_and_reply",
  "draft_reply",
  "create_event",
  "mark_done",
  "review",
  "none",
]);

export const priorityLabelSchema = z.enum(["low", "normal", "high", "urgent"]);

export const suggestedCalendarActionSchema = z
  .object({
    type: z.enum(["create_event", "update_event", "none"]),
    title: z.string().nullable(),
    attendees: z.array(z.string()).default([]),
    startTime: z.string().nullable(),
    durationMinutes: z.number().int().min(15).max(240).nullable(),
    timezone: z.string().nullable(),
    description: z.string().nullable(),
  })
  .nullable();

export const autopilotScoreSchema = z.object({
  confidence: z.number().min(0).max(1),
  estimatedMinutesSaved: z.number().int().min(0).max(60),
  reasoning: z.string(),
});

export const aiTriageOutputSchema = z.object({
  workflowType: workflowTypeSchema,
  priorityLabel: priorityLabelSchema,
  priorityScore: z.number().int().min(1).max(10),
  summary: z.string().min(1),
  recommendedAction: recommendedActionSchema,
  suggestedReply: z.string().nullable(),
  suggestedCalendarAction: suggestedCalendarActionSchema,
  autopilotScore: autopilotScoreSchema,
  intentTimeline: z.array(z.string()).min(2).max(6),
  changeSummary: z.string().nullable(),
  memoryHint: z.string().nullable(),
});

export type AiTriageOutput = z.infer<typeof aiTriageOutputSchema>;
