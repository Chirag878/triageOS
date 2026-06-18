import { createCorsairClient } from "@/lib/corsair/client";
import { unwrapCorsairPayload } from "@/lib/corsair/run";

export type GmailDraftReplyInput = {
  tenantId: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
};

const GMAIL_CREATE_DRAFT_PATH = "gmail.api.drafts.create";
const GMAIL_SEND_MESSAGE_PATH = "gmail.api.messages.send";

export async function createGmailDraftReply(input: GmailDraftReplyInput) {
  const corsair = createCorsairClient();

  return unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: GMAIL_CREATE_DRAFT_PATH,
      payload: buildDraftPayload(input),
    }),
  );
}

export async function sendGmailReply(input: GmailDraftReplyInput) {
  const corsair = createCorsairClient();

  return unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: GMAIL_SEND_MESSAGE_PATH,
      payload: buildSendPayload(input),
    }),
  );
}

function buildDraftPayload(input: GmailDraftReplyInput) {
  return {
    requestBody: {
      message: buildGmailMessage(input),
    },
  };
}

function buildSendPayload(input: GmailDraftReplyInput) {
  return {
    requestBody: buildGmailMessage(input),
  };
}

function buildGmailMessage(input: GmailDraftReplyInput) {
  return {
    raw: buildRawEmail({
      to: input.to,
      subject: input.subject.startsWith("Re:")
        ? input.subject
        : `Re: ${input.subject}`,
      body: input.body,
    }),
    threadId: input.threadId ?? undefined,
  };
}

function buildRawEmail(input: { to: string; subject: string; body: string }) {
  const message = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    input.body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
