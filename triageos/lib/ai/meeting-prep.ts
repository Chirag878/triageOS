import OpenAI from "openai";
import { z } from "zod";

import type { CalendarEventView } from "@/lib/calendar/events";
import type { CalendarSummaryInboxSignal } from "@/lib/ai/calendar-summary";

export type MeetingPrepInput = {
  event: CalendarEventView;
  inboxSignals: CalendarSummaryInboxSignal[];
  now?: Date;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const meetingPrepSchema = z.object({
  objective: z.string().min(1),
  context: z.string().min(1),
  attendeeNotes: z.array(z.string()).min(1).max(5),
  agenda: z.array(z.string()).min(1).max(6),
  openQuestions: z.array(z.string()).min(1).max(6),
  suggestedActions: z.array(z.string()).min(1).max(5),
  approvalNote: z.string().min(1),
  generatedBy: z.enum(["openai", "deterministic"]).default("openai"),
});

export type MeetingPrep = z.infer<typeof meetingPrepSchema>;

export async function generateMeetingPrep(input: MeetingPrepInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallbackPrep(input);

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
            "You are the Meeting Prep AI for TriageOS.",
            "Use one calendar event and recent Gmail triage context to prepare the user.",
            "Suggest reviewable actions only. Never claim anything has been executed.",
            "Return only valid JSON matching the requested shape.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            now: (input.now ?? new Date()).toISOString(),
            event: input.event,
            inboxSignals: input.inboxSignals.slice(0, 12),
            requiredJsonShape: {
              objective: "one sentence meeting goal",
              context: "short context summary from calendar and Gmail",
              attendeeNotes: ["what to know about attendees"],
              agenda: ["ordered agenda items"],
              openQuestions: ["questions to resolve in the meeting"],
              suggestedActions: ["draft/prep/calendar actions for user approval"],
              approvalNote:
                "one sentence explaining TriageOS waits for approval before executing actions",
              generatedBy: "openai",
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildFallbackPrep(input);

    return meetingPrepSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("[meeting-prep] falling back after AI failure", error);
    return buildFallbackPrep(input);
  }
}

function buildFallbackPrep(input: MeetingPrepInput): MeetingPrep {
  const relatedInbox = input.inboxSignals.filter((signal) =>
    input.event.attendees.some((attendee) =>
      signal.fromEmail.toLowerCase().includes(attendee.toLowerCase()),
    ),
  );
  const highPriority = input.inboxSignals.find((signal) =>
    ["urgent", "high"].includes(signal.priorityLabel),
  );

  return {
    objective: `Make ${input.event.title} outcome-oriented and leave with clear next steps.`,
    context:
      relatedInbox[0]?.summary ??
      relatedInbox[0]?.subject ??
      input.event.description ??
      "No detailed agenda was found, so prep should focus on goals, blockers, and follow-up owners.",
    attendeeNotes: input.event.attendees.length
      ? input.event.attendees.slice(0, 5).map((attendee) => `Prepare context for ${attendee}.`)
      : ["No attendees are visible yet; confirm who needs to be in the room."],
    agenda: [
      "Confirm the goal and desired decision.",
      "Review any inbox context or unresolved asks.",
      "Agree on owners, dates, and follow-up channel.",
    ],
    openQuestions: [
      "What decision should be made by the end?",
      "Is there a draft reply or calendar change that should be approved after the meeting?",
      highPriority
        ? `Does ${highPriority.subject} need to be resolved before this meeting?`
        : "Are there missing details TriageOS should turn into a draft or event?",
    ],
    suggestedActions: [
      "Review the linked Gmail workflow cards before the meeting.",
      "Approve any draft reply or calendar action only after checking the details.",
    ],
    approvalNote:
      "TriageOS can propose follow-up drafts and calendar changes, but execution waits for your approval.",
    generatedBy: "deterministic",
  };
}
