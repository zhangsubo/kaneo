import { createHmac } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import {
  buildFeishuInteractiveCard,
  computeFeishuSign,
  formatFeishuAtTag,
} from "../sender";

describe("feishu-shared/sender", () => {
  it("computes the Feishu custom bot HMAC-SHA256 signature with timestamp+newline+secret as key", () => {
    const timestampSec = 1700000000;
    const secret = "feishu-bot-secret";
    const expected = createHmac("sha256", `${timestampSec}\n${secret}`).digest(
      "base64",
    );

    expect(computeFeishuSign(timestampSec, secret)).toBe(expected);
  });

  it("formats Feishu @mention tags for open_id, email, and all", () => {
    expect(formatFeishuAtTag("ou_123456")).toBe('<at id="ou_123456"></at>');
    expect(formatFeishuAtTag("all")).toBe('<at id="all"></at>');
    expect(formatFeishuAtTag("alice@example.com")).toBe(
      '<at email="alice@example.com"></at>',
    );
    expect(formatFeishuAtTag(null)).toBeNull();
  });

  it("builds an interactive card with optional @mention and view button", () => {
    const card = buildFeishuInteractiveCard({
      title: "Task Assigned",
      headerTemplate: "blue",
      body: "**Task:** PROJ-1 Fix login",
      atId: "ou_abc123",
      actionUrl: "https://kaneo.example.com/task/1",
      actionLabel: "View in Kaneo",
    });

    expect(card.header).toEqual({
      title: { tag: "plain_text", content: "Task Assigned" },
      template: "blue",
    });
    const elements = card.elements as Array<Record<string, unknown>>;
    expect(elements).toHaveLength(2);
    expect(elements[0]).toEqual({
      tag: "div",
      text: {
        tag: "lark_md",
        content: '**Task:** PROJ-1 Fix login\n<at id="ou_abc123"></at>',
      },
    });
  });
});
