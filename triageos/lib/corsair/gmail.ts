import { createHash } from "node:crypto";

import { createCorsairClient } from "@/lib/corsair/client";

type JsonRecord = Record<string, unknown>;

export type CorsairGmailMessage = {
  id: string;
  threadId?: string | null;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  snippet: string;
  bodyPreview: string | null;
  receivedAt: Date;
  externalUrl?: string | null;
  contentHash: string;
};

const GMAIL_LIST_PATH = "gmail.api.messages.list";
const GMAIL_GET_PATH = "gmail.api.messages.get";

export async function fetchRecentGmailMessages(input: {
  tenantId: string;
  maxResults?: number;
}) {
  const maxResults = Math.min(Math.max(input.maxResults ?? 12, 1), 25);
  const corsair = createCorsairClient();
  const listPayload = unwrapCorsairRunPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: GMAIL_LIST_PATH,
      payload: {
        maxResults,
        q: "newer_than:30d -category:promotions",
      },
    }),
  );

  const listedMessages = extractMessageArray(listPayload).slice(0, maxResults);
  const hydratedMessages = await Promise.all(
    listedMessages.map(async (message) => {
      if (hasUsableMessageFields(message)) return message;

      const id = readString(message, "id");
      if (!id) return message;

      try {
        return unwrapCorsairRunPayload(
          await corsair.run({
            tenantId: input.tenantId,
            path: GMAIL_GET_PATH,
            payload: { id, format: "full" },
          }),
        );
      } catch {
        return message;
      }
    }),
  );

  return hydratedMessages
    .map(normalizeGmailMessage)
    .filter((message): message is CorsairGmailMessage => Boolean(message));
}

function unwrapCorsairRunPayload(payload: unknown): JsonRecord {
  if (!payload || typeof payload !== "object") return {};

  const record = payload as JsonRecord;

  if (record.success === false) {
    const error = readString(record, "error") ?? "Corsair Gmail action failed.";
    throw new Error(error);
  }

  if (
    record.success === true &&
    record.data &&
    typeof record.data === "object"
  ) {
    return record.data as JsonRecord;
  }

  if (record.data && typeof record.data === "object") {
    return record.data as JsonRecord;
  }

  if (record.result && typeof record.result === "object") {
    return record.result as JsonRecord;
  }

  return record;
}

function extractMessageArray(payload: JsonRecord) {
  const candidates = [payload.messages, payload.items, payload.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isJsonRecord);
    }
  }

  if (payload.message && isJsonRecord(payload.message))
    return [payload.message];

  return [];
}

function normalizeGmailMessage(
  message: JsonRecord,
): CorsairGmailMessage | null {
  const id = readString(message, "id") ?? readString(message, "messageId");
  if (!id) return null;

  const headers = extractHeaders(message);
  const fromEmail =
    getHeader(headers, "from") ??
    readString(message, "from") ??
    "unknown@gmail.com";
  const toEmails = splitEmails(
    getHeader(headers, "to") ?? readString(message, "to"),
  );
  const ccEmails = splitEmails(
    getHeader(headers, "cc") ?? readString(message, "cc"),
  );
  const subject =
    getHeader(headers, "subject") ??
    readString(message, "subject") ??
    "(no subject)";
  const snippet = readString(message, "snippet") ?? "";
  const bodyPreview = (readBodyPreview(message) ?? snippet) || null;
  const receivedAt = readReceivedAt(message, headers);
  const externalUrl =
    readString(message, "webLink") ?? readString(message, "externalUrl");
  const contentHash = createHash("sha256")
    .update(`${id}:${subject}:${snippet}:${bodyPreview ?? ""}`)
    .digest("hex");

  return {
    id,
    threadId: readString(message, "threadId"),
    fromEmail,
    toEmails,
    ccEmails,
    subject,
    snippet,
    bodyPreview,
    receivedAt,
    externalUrl,
    contentHash,
  };
}

function extractHeaders(message: JsonRecord) {
  const payload = isJsonRecord(message.payload) ? message.payload : null;
  const rawHeaders = Array.isArray(payload?.headers)
    ? payload.headers
    : Array.isArray(message.headers)
      ? message.headers
      : [];

  const headers = new Map<string, string>();

  for (const header of rawHeaders) {
    if (!isJsonRecord(header)) continue;
    const name = readString(header, "name")?.toLowerCase();
    const value = readString(header, "value");
    if (name && value) headers.set(name, value);
  }

  return headers;
}

function getHeader(headers: Map<string, string>, name: string) {
  return headers.get(name.toLowerCase()) ?? null;
}

function readBodyPreview(message: JsonRecord): string | null {
  const direct =
    readString(message, "body") ?? readString(message, "bodyPreview");
  if (direct) return trimPreview(direct);

  const payload = isJsonRecord(message.payload) ? message.payload : null;
  const body = isJsonRecord(payload?.body) ? payload.body : null;
  const encoded = readString(body ?? {}, "data");

  if (!encoded) return null;

  try {
    return trimPreview(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function readReceivedAt(message: JsonRecord, headers: Map<string, string>) {
  const internalDate = readString(message, "internalDate");
  if (internalDate && /^\d+$/.test(internalDate)) {
    return new Date(Number(internalDate));
  }

  const dateValue = getHeader(headers, "date") ?? readString(message, "date");
  if (dateValue) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function splitEmails(value?: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimPreview(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 800);
}

function hasUsableMessageFields(message: JsonRecord) {
  return Boolean(
    readString(message, "subject") ||
    readString(message, "snippet") ||
    (isJsonRecord(message.payload) && Array.isArray(message.payload.headers)),
  );
}

function readString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
