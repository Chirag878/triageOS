import type { UserPlanState } from "./plans";

export type UserRole = "user" | "admin";

export type AuthProvider = "email" | "magic_link" | "google";

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
};

export type SessionUser = AppUser & UserPlanState;

export type AuthSession = {
  user: SessionUser;
  expiresAt: string | null;
};

export type LoginFormValues = {
  email: string;
  password?: string;
};

export type SignupFormValues = {
  email: string;
  password?: string;
  fullName?: string;
};

export type AdminUserSummary = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  plan: UserPlanState["plan"];
  planSource: UserPlanState["planSource"];
  planExpiresAt: string | null;
  createdAt: string;
};