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

export async function createGmailDraftReply(input: GmailDraftReplyInput) {
  const corsair = createCorsairClient();
  const raw = buildRawEmail({
    to: input.to,
    subject: input.subject.startsWith("Re:")
      ? input.subject
      : `Re: ${input.subject}`,
    body: input.body,
  });

  return unwrapCorsairPayload(
    await corsair.run({
      tenantId: input.tenantId,
      path: GMAIL_CREATE_DRAFT_PATH,
      payload: {
        requestBody: {
          message: {
            raw,
            threadId: input.threadId ?? undefined,
          },
        },
      },
    }),
  );
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
