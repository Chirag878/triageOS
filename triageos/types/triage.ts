import type {
  PriorityLabel,
  RecommendedAction,
  WorkflowStatus,
  WorkflowType,
} from "./workflow";

export type EmailProvider = "gmail";

export type EmailParticipant = {
  email: string;
  name?: string | null;
};

export type CalendarActionType = "create_event" | "update_event" | "none";

export type SuggestedCalendarAction = {
  type: CalendarActionType;
  title?: string;
  attendees?: string[];
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  timezone?: string;
  description?: string;
  location?: string;
  conferenceLinkRequested?: boolean;
};

export type AutopilotScore = {
  confidence: number;
  estimatedMinutesSaved: number;
  reasoning: string;
};

export type TriageItemStatus = WorkflowStatus;

export type TriageItem = {
  id: string;
  userId: string;

  provider: EmailProvider;
  externalMessageId: string;
  externalThreadId: string | null;

  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];

  subject: string;
  snippet: string | null;
  bodyPreview: string | null;
  receivedAt: string;

  workflowType: WorkflowType;
  recommendedAction: RecommendedAction;

  priorityLabel: PriorityLabel;
  priorityScore: number;

  summary: string;
  suggestedReply: string | null;
  suggestedCalendarAction: SuggestedCalendarAction | null;

  autopilotScore: AutopilotScore | null;
  intentTimeline: string[];
  changeSummary: string | null;
  memoryHint: string | null;

  status: TriageItemStatus;
  executedAt: string | null;
  errorMessage: string | null;

  createdAt: string;
  updatedAt: string;
};

export type TriageQueueFilters = {
  status?: TriageItemStatus;
  workflowType?: WorkflowType;
  priorityLabel?: PriorityLabel;
  search?: string;
};

export type TriageQueueResponse = {
  items: TriageItem[];
  total: number;
  hasMore: boolean;
};