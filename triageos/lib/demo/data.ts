import { createHash } from "node:crypto";

import type { AiTriageOutput } from "@/lib/ai/schemas";
import type { CorsairCalendarEvent } from "@/lib/corsair/calendar-sync";
import type { CorsairGmailMessage } from "@/lib/corsair/gmail";

const DEMO_NOW = new Date("2026-06-18T09:00:00.000Z");

export function getDemoGmailMessages(maxResults = 12): CorsairGmailMessage[] {
  return [
    {
      id: "demo-gmail-investor-sync",
      threadId: "demo-thread-investor-sync",
      fromEmail: "Maya Shah <maya@northstar.vc>",
      toEmails: ["founder@triageos.ai"],
      ccEmails: [],
      subject: "Can we move the diligence sync to tomorrow?",
      snippet:
        "Could we shift tomorrow's diligence sync to 3 PM IST and include Arjun from product?",
      bodyPreview:
        "Could we shift tomorrow's diligence sync to 3 PM IST and include Arjun from product? We'd like to cover retention, GTM assumptions, and the Google integration demo.",
      receivedAt: addHours(DEMO_NOW, -2),
      externalUrl: null,
      contentHash: hash("demo-gmail-investor-sync"),
    },
    {
      id: "demo-gmail-customer-escalation",
      threadId: "demo-thread-customer-escalation",
      fromEmail: "Elena Park <elena@acmehealth.com>",
      toEmails: ["support@triageos.ai"],
      ccEmails: ["ops@acmehealth.com"],
      subject: "Urgent: need a follow-up plan before our 5 PM review",
      snippet:
        "The team needs a concise follow-up and owner list before our 5 PM review today.",
      bodyPreview:
        "The team needs a concise follow-up and owner list before our 5 PM review today. Can you send a draft with next steps and propose a 20-minute check-in?",
      receivedAt: addHours(DEMO_NOW, -1),
      externalUrl: null,
      contentHash: hash("demo-gmail-customer-escalation"),
    },
    {
      id: "demo-gmail-product-feedback",
      threadId: "demo-thread-product-feedback",
      fromEmail: "Rohan Mehta <rohan@designpartner.io>",
      toEmails: ["founder@triageos.ai"],
      ccEmails: [],
      subject: "Feedback from yesterday's AI inbox walkthrough",
      snippet:
        "Loved the safe execution flow. A daily briefing would make the value instantly obvious.",
      bodyPreview:
        "Loved the safe execution flow. A daily briefing would make the value instantly obvious. Happy to jump on a short call next week to share more notes.",
      receivedAt: addHours(DEMO_NOW, -5),
      externalUrl: null,
      contentHash: hash("demo-gmail-product-feedback"),
    },
  ].slice(0, maxResults);
}

export function getDemoCalendarEvents(maxResults = 10): CorsairCalendarEvent[] {
  return [
    {
      id: "demo-calendar-standup",
      calendarId: "primary",
      title: "Founder standup",
      description: "Prep hackathon flow and judge demo beats.",
      location: null,
      startTime: "2026-06-18T10:00:00.000Z",
      endTime: "2026-06-18T10:30:00.000Z",
      timezone: "UTC",
      attendees: ["founder@triageos.ai", "demo@triageos.ai"],
      status: "confirmed",
      htmlLink: null,
      raw: {},
    },
    {
      id: "demo-calendar-investor",
      calendarId: "primary",
      title: "Northstar diligence sync",
      description: "Retention, GTM, and integration walkthrough.",
      location: null,
      startTime: "2026-06-19T09:30:00.000Z",
      endTime: "2026-06-19T10:00:00.000Z",
      timezone: "UTC",
      attendees: ["maya@northstar.vc", "arjun@triageos.ai"],
      status: "confirmed",
      htmlLink: null,
      raw: {},
    },
  ].slice(0, maxResults);
}

export function generateDemoAiWorkflowCard(input: {
  fromEmail: string;
  subject: string;
  bodyPreview: string | null;
  snippet: string;
}): AiTriageOutput {
  const text = `${input.subject} ${input.snippet} ${input.bodyPreview ?? ""}`;
  const isUrgent = /urgent|today|5 pm|blocked/i.test(text);
  const isMeeting = /sync|call|meeting|review|check-in|tomorrow|pm/i.test(text);
  const title = isUrgent
    ? "Customer follow-up review"
    : isMeeting
      ? "Diligence sync"
      : "Product feedback follow-up";

  return {
    workflowType: isMeeting ? "meeting_request" : "needs_reply",
    priorityLabel: isUrgent ? "urgent" : isMeeting ? "high" : "normal",
    priorityScore: isUrgent ? 9 : isMeeting ? 8 : 6,
    summary: isUrgent
      ? "A customer needs a crisp follow-up plan before today's review."
      : isMeeting
        ? "A stakeholder is asking to coordinate a meeting and confirm details."
        : "A partner shared feedback and invited a short follow-up.",
    recommendedAction: isMeeting ? "schedule_and_reply" : "draft_reply",
    suggestedReply: buildDemoReply(input.fromEmail, isUrgent, isMeeting),
    suggestedCalendarAction: isMeeting
      ? {
          type: "create_event",
          title,
          attendees: [extractEmail(input.fromEmail)],
          startTime: isUrgent
            ? "2026-06-18T11:30:00.000Z"
            : "2026-06-19T09:30:00.000Z",
          durationMinutes: isUrgent ? 20 : 30,
          timezone: "UTC",
          description:
            "Created from a TriageOS AI workflow card after human review.",
        }
      : {
          type: "none",
          title: null,
          attendees: [],
          startTime: null,
          durationMinutes: null,
          timezone: null,
          description: null,
        },
    autopilotScore: {
      confidence: isUrgent ? 0.91 : 0.86,
      estimatedMinutesSaved: isMeeting ? 18 : 9,
      reasoning:
        "The email has clear intent, sender context, and enough detail for a reviewable draft.",
    },
    intentTimeline: [
      "Identified the sender's requested outcome.",
      "Mapped the email to a safe draft-and-review workflow.",
      isMeeting
        ? "Extracted meeting intent and proposed a calendar action."
        : "No calendar action needed; prepared a concise reply.",
      "Kept execution gated behind human approval.",
    ],
    changeSummary:
      "Prepared a reply and any calendar fields for review before execution.",
    memoryHint:
      "Demo mode: this card is deterministic so the judge flow stays reliable.",
  };
}

function buildDemoReply(fromEmail: string, isUrgent: boolean, isMeeting: boolean) {
  const name = fromEmail.split("<")[0]?.trim() || "there";

  if (isUrgent) {
    return `Hi ${name},\n\nThanks for the heads up. I can send over a concise follow-up plan before the 5 PM review with owners, next steps, and a proposed 20-minute check-in.\n\nBest,\nTriageOS`;
  }

  if (isMeeting) {
    return `Hi ${name},\n\nTomorrow at 3 PM IST works on our side. I will include Arjun and add retention, GTM assumptions, and the Google integration demo to the agenda.\n\nBest,\nTriageOS`;
  }

  return `Hi ${name},\n\nThanks for the thoughtful feedback. The daily briefing direction is helpful, and I would be glad to schedule a short follow-up next week to compare notes.\n\nBest,\nTriageOS`;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}
