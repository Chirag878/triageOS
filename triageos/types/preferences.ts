export type ReplyTone =
  | "concise"
  | "friendly"
  | "professional"
  | "warm"
  | "direct";

export type PreferredMeetingTime =
  | "morning"
  | "afternoon"
  | "evening"
  | "anytime";

export type UserPreferences = {
  userId: string;
  defaultReplyTone: ReplyTone;
  preferredMeetingDuration: number;
  preferredMeetingTime: PreferredMeetingTime;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};