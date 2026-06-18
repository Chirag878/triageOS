import { NextResponse, type NextRequest } from "next/server";

import { CORSAIR_PLUGIN_IDS } from "@/config/corsair";
import { requireUser } from "@/lib/auth/session";
import { CorsairError, createCorsairClient } from "@/lib/corsair/client";
import { reconcileCorsairStatus } from "@/lib/corsair/status";
import {
  getOrCreateCorsairConnection,
  updateCorsairConnectionStatus,
} from "@/lib/corsair/tenant";

const ALLOWED_RETURN_PATHS = new Set([
  "/briefing",
  "/gmail",
  "/calendar",
  "/dashboard",
  "/onboarding",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));
  const pluginId = sanitizePluginId(url.searchParams.get("plugin"), returnTo);
  const destination = new URL(returnTo, url.origin);
  const profile = await requireUser();

  console.info("[corsair.connected] callback entered", {
    userId: profile.id,
    returnTo,
    pluginId,
    callbackUrl: url.toString(),
  });

  const callbackError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (callbackError) {
    console.warn("[corsair.connected] callback returned error", {
      userId: profile.id,
      pluginId,
      callbackError,
    });
    destination.searchParams.set("connected", "0");
    destination.searchParams.set("verified", "0");
    destination.searchParams.set("connectionStatus", "error");
    return NextResponse.redirect(destination);
  }

  try {
    const connection = await getOrCreateCorsairConnection(profile.id);
    const remoteStatus = await createCorsairClient().getTenantStatus(
      connection.corsairAccountId,
    );
    console.info("[corsair.connected] remote Corsair status", {
      userId: profile.id,
      tenantId: connection.corsairAccountId,
      remoteStatus,
    });
    const { resolved } = await reconcileCorsairStatus({
      userId: profile.id,
      remoteStatus,
    });
    const pluginWasResolved =
      pluginId === CORSAIR_PLUGIN_IDS.gmail
        ? resolved.gmailConnected !== null
        : resolved.calendarConnected !== null;

    if (!pluginWasResolved) {
      console.info(
        "[corsair.connected] remote status inconclusive; marking callback plugin connected",
        {
          userId: profile.id,
          tenantId: connection.corsairAccountId,
          pluginId,
        },
      );
      await updateCorsairConnectionStatus({
        userId: profile.id,
        gmailConnected:
          pluginId === CORSAIR_PLUGIN_IDS.gmail ? true : undefined,
        calendarConnected:
          pluginId === CORSAIR_PLUGIN_IDS.calendar ? true : undefined,
      });
    }

    destination.searchParams.set("connected", "1");
    destination.searchParams.set("verified", "1");

    console.info("[corsair.connected] final redirect destination", {
      userId: profile.id,
      pluginId,
      destination: destination.toString(),
    });
  } catch (error) {
    console.warn("[corsair.connected] reconciliation failed", {
      userId: profile.id,
      pluginId,
      error: error instanceof Error ? error.message : error,
    });
    await updateCorsairConnectionStatus({
      userId: profile.id,
      gmailConnected: pluginId === CORSAIR_PLUGIN_IDS.gmail ? true : undefined,
      calendarConnected:
        pluginId === CORSAIR_PLUGIN_IDS.calendar ? true : undefined,
    });
    destination.searchParams.set("connected", "1");
    destination.searchParams.set("verified", "1");

    if (error instanceof CorsairError || error instanceof Error) {
      destination.searchParams.set("connectionStatus", "pending");
    }

    console.info("[corsair.connected] final redirect destination", {
      userId: profile.id,
      pluginId,
      destination: destination.toString(),
    });
  }

  return NextResponse.redirect(destination);
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
