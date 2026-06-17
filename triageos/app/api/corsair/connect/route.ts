import { NextResponse } from "next/server";

import {
  CORSAIR_CONNECT_PLUGINS,
  CORSAIR_CONNECT_RETURN_PATH,
} from "@/config/corsair";
import { getPublicEnv } from "@/config/env";
import { requireUser } from "@/lib/auth/session";
import { CorsairError, createCorsairClient } from "@/lib/corsair/client";
import { getOrCreateCorsairConnection } from "@/lib/corsair/tenant";

export async function POST() {
  try {
    const profile = await requireUser();
    const connection = await getOrCreateCorsairConnection(profile.id);
    const corsair = createCorsairClient();
    const env = getPublicEnv();

    const connectLink = await corsair.createConnectLink({
      tenantId: connection.corsairAccountId,
      plugins: CORSAIR_CONNECT_PLUGINS,
      returnUrl: `${env.appUrl}${CORSAIR_CONNECT_RETURN_PATH}`,
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
