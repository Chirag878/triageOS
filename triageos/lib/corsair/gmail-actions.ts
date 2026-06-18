import { createCorsairClient } from "@/lib/corsair/client";
import { unwrapCorsairPayload } from "@/lib/corsair/run";

type JsonRecord = Record<string, unknown>;

export type GmailDraftReplyInput = {
  tenantId: string;
  to: string;
  subject: string;
  body: string;
  from?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  threadId?: string | null;
};

const GMAIL_CREATE_DRAFT_PATH = "gmail.api.drafts.create";
const GMAIL_SEND_MESSAGE_PATH = "gmail.api.messages.send";

export async function createGmailDraftReply(input: GmailDraftReplyInput) {
  return runGmailAction({
    tenantId: input.tenantId,
    label: "create Gmail draft",
    attempts: [
      {
        path: GMAIL_CREATE_DRAFT_PATH,
        payload: buildDraftRawPayload(input),
      },
      {
        path: GMAIL_CREATE_DRAFT_PATH,
        payload: buildDraftPayload(input),
      },
      {
        path: GMAIL_CREATE_DRAFT_PATH,
        payload: buildDraftRestPayload(input),
      },
    ],
  });
}

export async function sendGmailReply(input: GmailDraftReplyInput) {
  return runGmailAction({
    tenantId: input.tenantId,
    label: "send Gmail reply",
    attempts: [
      {
        path: GMAIL_SEND_MESSAGE_PATH,
        payload: buildSendRawPayload(input),
      },
      {
        path: GMAIL_SEND_MESSAGE_PATH,
        payload: buildSendPayload(input),
      },
      {
        path: GMAIL_SEND_MESSAGE_PATH,
        payload: buildSendRestPayload(input),
      },
    ],
  });
}

async function runGmailAction(input: {
  tenantId: string;
  label: string;
  attempts: Array<{ path: string; payload: JsonRecord }>;
}) {
  const corsair = createCorsairClient();
  const failures: string[] = [];

  for (const attempt of input.attempts) {
    try {
      console.info("[corsair.gmail] running action", {
        label: input.label,
        operation: attempt.path,
        payload: sanitizeGmailPayload(attempt.payload),
      });

      return unwrapCorsairPayload(
        await corsair.run({
          tenantId: input.tenantId,
          path: attempt.path,
          payload: attempt.payload,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Corsair Gmail error.";
      failures.push(`${attempt.path}: ${message}`);
      console.warn("[corsair.gmail] action attempt failed", {
        label: input.label,
        operation: attempt.path,
        payload: sanitizeGmailPayload(attempt.payload),
        message,
      });
    }
  }

  const catalog = await getGmailCatalogDiagnostic();

  throw new Error(
    `Unable to ${input.label} through Corsair. Attempted operations: ${input.attempts
      .map((attempt) => attempt.path)
      .join(", ")}. Sanitized payloads: ${input.attempts
      .map((attempt) => `${attempt.path} ${JSON.stringify(sanitizeGmailPayload(attempt.payload))}`)
      .join(" | ")}. Failures: ${failures.join(" | ")}. Gmail catalog: ${catalog}`,
  );
}

function buildDraftRawPayload(input: GmailDraftReplyInput) {
  return buildGmailMessage(input);
}

function buildDraftPayload(input: GmailDraftReplyInput) {
  return {
    message: buildGmailMessage(input),
  };
}

function buildSendRawPayload(input: GmailDraftReplyInput) {
  return buildGmailMessage(input);
}

function buildSendPayload(input: GmailDraftReplyInput) {
  return {
    message: buildGmailMessage(input),
  };
}

function buildDraftRestPayload(input: GmailDraftReplyInput) {
  return {
    requestBody: {
      message: buildGmailMessage(input),
    },
  };
}

function buildSendRestPayload(input: GmailDraftReplyInput) {
  return {
    requestBody: buildGmailMessage(input),
  };
}

function buildGmailMessage(input: GmailDraftReplyInput) {
  return {
    raw: buildRawGmailMessage({
      from: input.from,
      to: input.to,
      subject: input.subject.startsWith("Re:")
        ? input.subject
        : `Re: ${input.subject}`,
      body: input.body,
      inReplyTo: input.inReplyTo,
      references: input.references,
    }),
    threadId: input.threadId ?? undefined,
  };
}

export function buildRawGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  from?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const headers = [
    input.from ? `From: ${input.from}` : null,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
    input.references ? `References: ${input.references}` : null,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
  ].filter(Boolean);

  const message = [
    ...headers,
    "",
    input.body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sanitizeGmailPayload(payload: JsonRecord): JsonRecord {
  if (typeof payload.raw === "string") {
    return sanitizeGmailMessage(payload);
  }

  if (isJsonRecord(payload.message)) {
    return {
      keys: Object.keys(payload),
      message: sanitizeGmailMessage(payload.message),
    };
  }

  if (isJsonRecord(payload.requestBody)) {
    if (isJsonRecord(payload.requestBody.message)) {
      return {
        keys: Object.keys(payload),
        requestBody: {
          keys: Object.keys(payload.requestBody),
          message: sanitizeGmailMessage(payload.requestBody.message),
        },
      };
    }

    return {
      keys: Object.keys(payload),
      requestBody: sanitizeGmailMessage(payload.requestBody),
    };
  }

  return {
    keys: Object.keys(payload),
    includesRaw: false,
    includesThreadId: typeof payload.threadId === "string",
  };
}

function sanitizeGmailMessage(message: JsonRecord): JsonRecord {
  return {
    keys: Object.keys(message),
    includesRaw: typeof message.raw === "string",
    raw: typeof message.raw === "string" ? `<base64url:${message.raw.length}>` : typeof message.raw,
    includesThreadId: typeof message.threadId === "string",
    threadId: typeof message.threadId === "string" ? "<threadId>" : message.threadId,
  };
}

async function getGmailCatalogDiagnostic() {
  try {
    const sdk = (await import("@corsair-dev/app")) as unknown as {
      PLUGINS_BY_ID?: Record<string, unknown>;
      PLUGINS?: readonly unknown[];
    };
    const gmail =
      sdk.PLUGINS_BY_ID?.gmail ??
      sdk.PLUGINS?.find(
        (plugin) =>
          isJsonRecord(plugin) &&
          typeof plugin.id === "string" &&
          plugin.id === "gmail",
      );

    return JSON.stringify({
      gmail: gmail ?? "gmail catalog entry unavailable",
      availableOperationNames:
        "The installed @corsair-dev/app catalog exposes plugin metadata/counts, not individual Gmail operation names.",
      knownFromCodeAndSdkExamples: [
        "gmail.api.messages.list",
        "gmail.api.messages.get",
        GMAIL_CREATE_DRAFT_PATH,
        GMAIL_SEND_MESSAGE_PATH,
      ],
    });
  } catch (error) {
    return error instanceof Error
      ? `unable to load SDK catalog: ${error.message}`
      : "unable to load SDK catalog";
  }
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
