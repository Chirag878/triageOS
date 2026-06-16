export type WorkflowType =
  | "meeting_request"
  | "needs_reply"
  | "follow_up"
  | "calendar_update"
  | "fyi"
  | "newsletter"
  | "unknown";

export type RecommendedAction =
  | "schedule_and_reply"
  | "draft_reply"
  | "send_reply"
  | "create_calendar_event"
  | "update_calendar_event"
  | "mark_done"
  | "review_only"
  | "no_action";

export type WorkflowStatus =
  | "new"
  | "ready"
  | "pending_confirmation"
  | "executing"
  | "completed"
  | "failed"
  | "dismissed";

export type PriorityLabel = "low" | "medium" | "high" | "urgent";

export type ActionType =
  | "create_calendar_event"
  | "update_calendar_event"
  | "draft_email_reply"
  | "send_email_reply"
  | "mark_email_done"
  | "agent_command";

export type ActionStatus = "pending" | "success" | "failed";

export type ExecutionMode = "draft_only" | "confirm_before_send" | "auto_execute";

export type WorkflowShortcut =
  | "j"
  | "k"
  | "r"
  | "s"
  | "e"
  | "mod+k"
  | "mod+enter"
  | "escape";