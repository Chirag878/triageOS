import { NextResponse, type NextRequest } from "next/server";

import { ensureProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next") ?? "/briefing";

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?message=${encodeURIComponent(error)}`,
        requestUrl.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/error?message=Missing auth code.", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?message=${encodeURIComponent(exchangeError.message)}`,
        requestUrl.origin,
      ),
    );
  }

  await ensureProfile();

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
