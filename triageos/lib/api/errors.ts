import { NextResponse } from "next/server";

export function apiErrorResponse(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500,
) {
  if (isNextRedirectError(error)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? error.digest : null;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
