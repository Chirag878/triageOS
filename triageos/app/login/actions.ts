"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { getPublicEnv } from "@/config/env";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { ensureProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type AuthState = {
  message: string;
  ok: boolean;
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z.object({
  fullName: z.string().trim().max(120, "Name is too long.").optional(),
  email: emailSchema,
  password: passwordSchema,
});

const magicLinkSchema = z.object({ email: emailSchema });
const forgotPasswordSchema = z.object({ email: emailSchema });
const resetPasswordSchema = z.object({ password: passwordSchema });

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function failFromZod(error: z.ZodError): AuthState {
  return {
    ok: false,
    message: error.issues[0]?.message ?? "Invalid form input.",
  };
}

function rateLimitOrFail(key: string, limit = 5): AuthState | null {
  const result = checkRateLimit(key, limit, 60_000);

  if (!result.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${result.retryAfterSeconds}s.`,
    };
  }

  return null;
}

export async function signInWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  const limited = rateLimitOrFail(`signin:${parsed.data.email}`);
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, message: error.message };
  }

  await ensureProfile();
  redirect("/briefing");
}

export async function signUpWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    fullName: formValue(formData, "fullName") || undefined,
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  const limited = rateLimitOrFail(`signup:${parsed.data.email}`, 3);
  if (limited) return limited;

  const supabase = await createClient();
  const env = getPublicEnv();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.appUrl}/auth/callback?next=/briefing`,
      data: { full_name: parsed.data.fullName || null },
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data.session) {
    await ensureProfile();
    redirect("/briefing");
  }

  return {
    ok: true,
    message:
      "Account created. If the email does not arrive, use Guest mode or disable email confirmations in Supabase for local demo.",
  };
}

export async function sendMagicLink(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = magicLinkSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  const limited = rateLimitOrFail(`magic:${parsed.data.email}`, 3);
  if (limited) return limited;

  const supabase = await createClient();
  const env = getPublicEnv();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=/briefing` },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Magic link sent. Check your email to continue.",
  };
}

export async function sendPasswordReset(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  const limited = rateLimitOrFail(`forgot:${parsed.data.email}`, 3);
  if (limited) return limited;

  const supabase = await createClient();
  const env = getPublicEnv();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${env.appUrl}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Password reset link sent. Check your email." };
}

export async function updatePassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return failFromZod(parsed.error);
  }

  const limited = rateLimitOrFail("reset-password", 5);
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  await ensureProfile();
  redirect("/briefing");
}

export async function continueAsGuest(): Promise<AuthState> {
  const limited = rateLimitOrFail("guest", 10);
  if (limited) return limited;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: "Guest workspace" } },
  });

  if (error) {
    return {
      ok: false,
      message:
        error.message.includes("Anonymous sign-ins are disabled") ||
        error.message.includes("anonymous")
          ? "Guest mode is not enabled in Supabase. Enable Anonymous sign-ins or disable email confirmations for the hackathon demo."
          : error.message,
    };
  }

  await ensureProfile();
  redirect("/briefing");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
