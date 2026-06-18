import { NextResponse } from "next/server";
import { z } from "zod";

import {
  CORSAIR_CONNECT_PLUGINS,
  CORSAIR_CONNECT_RETURN_PATH,
} from "@/config/corsair";
import { getPublicEnv } from "@/config/env";
import { requireUser } from "@/lib/auth/session";
import { CorsairError, createCorsairClient } from "@/lib/corsair/client";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

const connectSchema = z.object({
  returnTo: z.string().startsWith("/").optional(),
});

const ALLOWED_RETURN_TO = new Set([
  "/dashboard",
  "/gmail",
  "/calendar",
  "/onboarding",
  "/settings",
]);

export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const body = await request.json().catch(() => ({}));
    const input = connectSchema.parse(body);
    const connection = await getOrCreateCorsairConnection(profile.id);
    const corsair = createCorsairClient();
    const env = getPublicEnv();

    const returnTo =
      input.returnTo && ALLOWED_RETURN_TO.has(input.returnTo)
        ? input.returnTo
        : "/dashboard";
    const returnUrl = new URL(CORSAIR_CONNECT_RETURN_PATH, env.appUrl);
    returnUrl.searchParams.set("next", returnTo);

    const connectLink = await corsair.createConnectLink({
      tenantId: connection.corsairAccountId,
      plugins: CORSAIR_CONNECT_PLUGINS,
      returnUrl: returnUrl.toString(),
    });

    return NextResponse.json({
      url: connectLink.url,
      expiresAt: connectLink.expiresAt ?? null,
    });
  } catch (error) {
    const status = error instanceof CorsairError ? 502 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create Corsair connect link.";

    return NextResponse.json({ error: message }, { status });
  }
}
