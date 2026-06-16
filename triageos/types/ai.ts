import type {
  PriorityLabel,
  RecommendedAction,
  WorkflowType,
} from "./workflow";
import type { AutopilotScore, SuggestedCalendarAction } from "./triage";

export type AiPlannerInput = {
  email: {
    fromEmail: string;
    fromName?: string | null;
    subject: string;
    bodyPreview: string;
    receivedAt: string;
  };
  userPreferences: {
    timezone: string;
    defaultReplyTone: string;
    preferredMeetingDuration: number;
    preferredMeetingTime: string;
  };
  currentDate: string;
};

export type AiWorkflowCardOutput = {
  workflowType: WorkflowType;
  priorityLabel: PriorityLabel;
  priorityScore: number;

  summary: string;
  recommendedAction: RecommendedAction;

  suggestedReply: string | null;
  suggestedCalendarAction: SuggestedCalendarAction | null;

  autopilotScore: AutopilotScore;
  intentTimeline: string[];
  changeSummary: string | null;
  memoryHint: string | null;
};

export type AgentCommandInput = {
  command: string;
  userId: string;
  timezone: string;
};

export type AgentPlanStep = {
  id: string;
  label: string;
  description: string;
  actionType:
    | "create_calendar_event"
    | "draft_email_reply"
    | "send_email_reply"
    | "search_email"
    | "mark_email_done";
  requiresConfirmation: boolean;
};

export type AgentPlan = {
  summary: string;
  steps: AgentPlanStep[];
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
};