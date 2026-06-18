import { NextResponse } from "next/server";
import { z } from "zod";

import { CORSAIR_CONNECT_RETURN_PATH, CORSAIR_PLUGIN_IDS } from "@/config/corsair";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/session";
import { CorsairError, createCorsairClient } from "@/lib/corsair/client";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

const ALLOWED_RETURN_PATHS = new Set([
  "/briefing",
  "/gmail",
  "/calendar",
  "/dashboard",
  "/onboarding",
]);

const connectSchema = z.object({
  returnTo: z.string().optional(),
  plugin: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = connectSchema.parse(body);
    const connection = await getOrCreateCorsairConnection(profile.id);
    const corsair = createCorsairClient();
  
    const returnTo = sanitizeReturnTo(input.returnTo ?? null);
    const pluginId = sanitizePluginId(input.plugin ?? null, returnTo);
    const callbackUrl = new URL(CORSAIR_CONNECT_RETURN_PATH, request.url);
    callbackUrl.searchParams.set("returnTo", returnTo);
    callbackUrl.searchParams.set("plugin", pluginId);

    console.info("[corsair.connect] generated callback URL", {
      userId: profile.id,
      tenantId: connection.corsairAccountId,
      pluginId,
      returnTo,
      callbackUrl: callbackUrl.toString(),
    });

    const authorizeLink = await corsair.createOAuthAuthorizeLink({
      tenantId: connection.corsairAccountId,
      pluginId,
      returnTo: callbackUrl.toString(),
    });

    console.info("[corsair.connect] generated Corsair OAuth authorize URL", {
      userId: profile.id,
      tenantId: connection.corsairAccountId,
      pluginId,
      returnTo,
      callbackUrl: callbackUrl.toString(),
      authorizeUrl: authorizeLink.url,
      state: authorizeLink.state ?? null,
    });

    return NextResponse.json({
      url: authorizeLink.url,
      state: authorizeLink.state ?? null,
    });
  } catch (error) {
    const status = error instanceof CorsairError ? 502 : 500;
    return apiErrorResponse(
      error,
      "Failed to create Corsair OAuth authorize URL.",
      status,
    );
  }
}

function sanitizePluginId(value: string | null, returnTo: string) {
  if (value === CORSAIR_PLUGIN_IDS.gmail) return CORSAIR_PLUGIN_IDS.gmail;
  if (value === CORSAIR_PLUGIN_IDS.calendar) return CORSAIR_PLUGIN_IDS.calendar;

  if (returnTo === "/calendar") return CORSAIR_PLUGIN_IDS.calendar;
  return CORSAIR_PLUGIN_IDS.gmail;
}

function sanitizeReturnTo(value: string | null) {
  if (!value) return "/onboarding";

  try {
    const parsed = new URL(value, "https://triageos.local");
    const path = parsed.pathname;

    if (!ALLOWED_RETURN_PATHS.has(path)) return "/onboarding";
    return path === "/dashboard" ? "/briefing" : path;
  } catch {
    return "/onboarding";
  }
}
