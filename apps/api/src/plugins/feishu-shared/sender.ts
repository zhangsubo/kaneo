import { createHmac } from "node:crypto";
import {
  OutboundRequestError,
  sendOutboundRequest,
} from "../../utils/outbound-request";

export const feishuWebhookUrlPattern =
  /^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9_-]+$/i;

export const larkWebhookUrlPattern =
  /^https:\/\/open\.larksuite\.com\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9_-]+$/i;

export type FeishuCardHeaderTemplate =
  | "blue"
  | "turquoise"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "indigo";

export type FeishuCardField = {
  label: string;
  value: string;
};

export type BuildFeishuCardInput = {
  title: string;
  body: string;
  headerTemplate?: FeishuCardHeaderTemplate;
  fields?: FeishuCardField[];
  actionUrl?: string | null;
  actionLabel?: string;
  footerText?: string | null;
  atId?: string | null;
};

export function escapeFeishuMd(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Feishu / Lark custom bot signature algorithm:
 * key = `${timestampSec}\n${secret}`, message = ""
 */
export function computeFeishuSign(
  timestampSec: number,
  secret: string,
): string {
  const stringToSign = `${timestampSec}\n${secret}`;
  return createHmac("sha256", stringToSign).update("").digest("base64");
}

export function formatFeishuAtTag(atId?: string | null): string | null {
  const trimmed = atId?.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase() === "all") {
    return '<at id="all"></at>';
  }

  if (trimmed.includes("@")) {
    return `<at email="${escapeFeishuMd(trimmed)}"></at>`;
  }

  return `<at id="${escapeFeishuMd(trimmed)}"></at>`;
}

export function buildFeishuInteractiveCard(
  input: BuildFeishuCardInput,
): Record<string, unknown> {
  const atTag = formatFeishuAtTag(input.atId);
  const markdownText = atTag ? `${input.body}\n${atTag}` : input.body;

  const elements: Array<Record<string, unknown>> = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: markdownText,
      },
    },
  ];

  if (input.fields && input.fields.length > 0) {
    elements.push({
      tag: "div",
      fields: input.fields.map((field) => ({
        is_short: true,
        text: {
          tag: "lark_md",
          content: `**${escapeFeishuMd(field.label)}**\n${field.value}`,
        },
      })),
    });
  }

  if (input.actionUrl) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            tag: "plain_text",
            content: input.actionLabel ?? "View in Kaneo",
          },
          type: "primary",
          url: input.actionUrl,
        },
      ],
    });
  }

  if (input.footerText) {
    elements.push({
      tag: "note",
      elements: [
        {
          tag: "plain_text",
          content: input.footerText,
        },
      ],
    });
  }

  return {
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: input.headerTemplate ?? "blue",
      title: {
        tag: "plain_text",
        content: input.title,
      },
    },
    elements,
  };
}

export async function sendFeishuWebhook(input: {
  webhookUrl: string;
  secret?: string | null;
  card: Record<string, unknown>;
  timestampSec?: number;
}): Promise<void> {
  const trimmedSecret = input.secret?.trim();
  const timestampSec = input.timestampSec ?? Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    msg_type: "interactive",
    card: input.card,
  };

  if (trimmedSecret) {
    payload.timestamp = String(timestampSec);
    payload.sign = computeFeishuSign(timestampSec, trimmedSecret);
  }

  const response = await sendOutboundRequest(
    input.webhookUrl,
    {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
    "code" in response &&
    (response as { code?: unknown }).code !== 0
  ) {
    throw new OutboundRequestError("response");
  }
}
