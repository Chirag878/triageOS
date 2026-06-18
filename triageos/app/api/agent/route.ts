import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { actionLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

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

    await db.insert(actionLogs).values({
      userId: profile.id,
      actionType: "agent_command",
      actionPayload: { command: input.command, plan },
      status: "succeeded",
      result: {
        message:
          "Plan confirmed. MCP execution hooks are initialized; connect concrete Corsair tools next.",
      },
    });

    return NextResponse.json({
      plan,
      requiresConfirmation: false,
      result:
        "Plan confirmed and logged. The next implementation pass can map these plan steps to Corsair MCP tool calls.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to plan agent command.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildAgentPlan(command: string) {
  const lower = command.toLowerCase();
  const steps = [
    "Read the command and identify the intended Gmail/Calendar workflow.",
  ];

  if (
    lower.includes("schedule") ||
    lower.includes("meeting") ||
    lower.includes("calendar")
  ) {
    steps.push(
      "Prepare a Google Calendar event with title, attendees, date, time, and description.",
    );
  }

  if (
    lower.includes("email") ||
    lower.includes("reply") ||
    lower.includes("send") ||
    lower.includes("draft")
  ) {
    steps.push(
      "Prepare a Gmail draft or reply body for review before sending.",
    );
  }

  steps.push(
    "Show this plan and require explicit confirmation before any external action.",
  );

  return {
    title: inferPlanTitle(lower),
    steps,
    safety:
      "No Gmail or Calendar action runs until the user confirms the plan.",
  };
}

function inferPlanTitle(command: string) {
  if (command.includes("schedule") || command.includes("meeting"))
    return "Schedule and message";
  if (command.includes("reply") || command.includes("email"))
    return "Draft email response";
  return "Plan workflow command";
}
