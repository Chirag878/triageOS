export type UserPlan = "starter" | "pilot" | "autopilot";

export type PlanSource =
  | "free"
  | "manual"
  | "stripe"
  | "promo"
  | "hackathon";

export type PlanLimitValue = number | "unlimited";

export type PlanLimits = {
  aiTriageCardsPerMonth: PlanLimitValue;
  agentCommandsPerMonth: PlanLimitValue;
  emailAnalysesPerMonth: PlanLimitValue;
  calendarActionsPerMonth: PlanLimitValue;
};

export type PlanFeatureKey =
  | "gmail_connection"
  | "calendar_connection"
  | "ai_workflow_cards"
  | "basic_summaries"
  | "suggested_replies"
  | "calendar_action_suggestions"
  | "keyboard_shortcuts"
  | "command_palette"
  | "corsair_mcp_agent"
  | "priority_filtering"
  | "autopilot_score"
  | "intent_timeline"
  | "what_changed"
  | "command_memory"
  | "webhooks"
  | "advanced_search"
  | "calendar_conflict_detection";

export type PlanConfig = {
  id: UserPlan;
  name: string;
  priceMonthly: number;
  description: string;
  limits: PlanLimits;
  features: PlanFeatureKey[];
};

export type UserPlanState = {
  plan: UserPlan;
  planSource: PlanSource;
  planExpiresAt: string | null;
};