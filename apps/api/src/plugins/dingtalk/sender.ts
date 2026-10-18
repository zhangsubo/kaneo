import { createHmac } from "node:crypto";
import {
  OutboundRequestError,
  sendOutboundRequest,
} from "../../utils/outbound-request";

export const dingtalkWebhookUrlPattern =
  /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=[A-Za-z0-9_-]+$/i;

export type DingTalkField = {
  label: string;
  value: string;
};

export type BuildDingTalkMarkdownInput = {
  title: string;
  body: string;
  fields?: DingTalkField[];
  actionUrl?: string | null;
  actionLabel?: string;
  footerText?: string | null;
  atId?: string | null;
};

const MOBILE_PATTERN = /^\+?\d{7,15}$/;

/**
 * DingTalk custom bot signature algorithm:
 * key = secret, message = `${timestampMs}\n${secret}`
 */
export function computeDingTalkSign(
  timestampMs: number,
  secret: string,
): string {
  const stringToSign = `${timestampMs}\n${secret}`;
  const hmac = createHmac("sha256", secret)
    .update(stringToSign)
    .digest("base64");
  return encodeURIComponent(hmac);
}

export function buildDingTalkSignedUrl(
  webhookUrl: string,
  secret?: string | null,
  timestampMs = Date.now(),
): string {
  const trimmedSecret = secret?.trim();
  if (!trimmedSecret) {
    return webhookUrl;
  }

  const sign = computeDingTalkSign(timestampMs, trimmedSecret);
  const separator = webhookUrl.includes("?") ? "&" : "?";
  return `${webhookUrl}${separator}timestamp=${timestampMs}&sign=${sign}`;
}

export function buildDingTalkMarkdownPayload(
  input: BuildDingTalkMarkdownInput,
): Record<string, unknown> {
  const lines: string[] = [`### ${input.title}`, "", input.body];

  if (input.fields && input.fields.length > 0) {
    lines.push("");
    for (const field of input.fields) {
      lines.push(`- **${field.label}**: ${field.value}`);
    }
  }

  const trimmedAtId = input.atId?.trim();
  const atMobiles: string[] = [];
  const atUserIds: string[] = [];
  let isAtAll = false;

  if (trimmedAtId) {
    if (trimmedAtId.toLowerCase() === "all") {
      isAtAll = true;
    } else if (MOBILE_PATTERN.test(trimmedAtId)) {
      atMobiles.push(trimmedAtId);
      lines.push("", `@${trimmedAtId}`);
    } else {
      atUserIds.push(trimmedAtId);
      lines.push("", `@${trimmedAtId}`);
    }
  }

  if (input.actionUrl) {
    lines.push(
      "",
      `[${input.actionLabel ?? "View in Kaneo"}](${input.actionUrl})`,
    );
  }

  if (input.footerText) {
    lines.push("", `> ${input.footerText}`);
  }

  return {
    msgtype: "markdown",
    markdown: {
      title: input.title,
      text: lines.join("\n"),
    },
    at: {
      atMobiles,
      atUserIds,
      isAtAll,
    },
  };
}

export async function sendDingTalkWebhook(input: {
  webhookUrl: string;
  secret?: string | null;
  payload: Record<string, unknown>;
  timestampMs?: number;
}): Promise<void> {
  const signedUrl = buildDingTalkSignedUrl(
    input.webhookUrl,
    input.secret,
    input.timestampMs,
  );

  const response = await sendOutboundRequest(
    signedUrl,
    {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.payload),
    },
    {
      publicDestination: true,
      readJson: true,
      timeoutMs: 15_000,
    },
  );

  if (
    typeof response === "object" &&
    response !== null &&
    "errcode" in response &&
    (response as { errcode?: unknown }).errcode !== 0
  ) {
    throw new OutboundRequestError("response");
  }
}
