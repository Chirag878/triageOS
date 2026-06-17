"use server";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/config/env";
import { ensureProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type AuthState = {
  message: string;
  ok: boolean;
};

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signInWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formValue(formData, "email").toLowerCase();
  const password = formValue(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  await ensureProfile();
  redirect("/dashboard");
}

export async function signUpWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = formValue(formData, "fullName");
  const email = formValue(formData, "email").toLowerCase();
  const password = formValue(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const env = getPublicEnv();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.appUrl}/auth/callback?next=/dashboard`,
      data: { full_name: fullName || null },
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data.session) {
    await ensureProfile();
    redirect("/dashboard");
  }

  return {
    ok: true,
    message: "Check your email to confirm your TriageOS account.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
