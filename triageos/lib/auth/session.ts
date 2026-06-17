import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/config/env";
import { db } from "@/db/client";
import { profiles, usageCounters, userPreferences } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function ensureProfile() {
  const user = await getUser();

  if (!user?.email) {
    return null;
  }

  const email = user.email.toLowerCase();
  const adminEmails = getServerEnv().adminEmails;
  const role = adminEmails.includes(email) ? "admin" : "user";

  const [profile] = await db
    .insert(profiles)
    .values({
      id: user.id,
      email,
      fullName:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      role,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email,
        fullName:
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role,
        updatedAt: new Date(),
      },
    })
    .returning();

  await db
    .insert(userPreferences)
    .values({ userId: user.id })
    .onConflictDoNothing({ target: userPreferences.userId });

  await db
    .insert(usageCounters)
    .values({ userId: user.id, monthKey: monthKey() })
    .onConflictDoNothing({
      target: [usageCounters.userId, usageCounters.monthKey],
    });

  return profile;
}

export async function requireUser() {
  const profile = await ensureProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await requireUser();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}

export async function getProfileById(userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile ?? null;
}
