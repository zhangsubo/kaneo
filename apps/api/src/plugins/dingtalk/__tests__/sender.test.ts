import { createHmac } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import {
  buildDingTalkMarkdownPayload,
  buildDingTalkSignedUrl,
  computeDingTalkSign,
} from "../sender";

describe("dingtalk/sender", () => {
  it("computes the DingTalk HMAC-SHA256 signature and appends timestamp+sign query parameters", () => {
    const timestamp = 1700000000000;
    const secret = "SECtestsecret123";
    const rawHmac = createHmac("sha256", secret)
      .update(`${timestamp}\n${secret}`)
      .digest("base64");
    const expectedSign = encodeURIComponent(rawHmac);

    expect(computeDingTalkSign(timestamp, secret)).toBe(expectedSign);

    const signedUrl = buildDingTalkSignedUrl(
      "https://oapi.dingtalk.com/robot/send?access_token=abc",
      secret,
      timestamp,
    );
    expect(signedUrl).toBe(
      `https://oapi.dingtalk.com/robot/send?access_token=abc&timestamp=${timestamp}&sign=${expectedSign}`,
    );
  });

  it("builds a DingTalk markdown payload with mobile @mention", () => {
    const payload = buildDingTalkMarkdownPayload({
      title: "Task Assigned",
      body: "- **Task:** PROJ-1",
      atId: "13800138000",
      actionUrl: "https://kaneo.example.com/task/1",
    });

    expect(payload.msgtype).toBe("markdown");
    expect(payload.at).toEqual({
      atMobiles: ["13800138000"],
      atUserIds: [],
      isAtAll: false,
    });
    const markdown = payload.markdown as { title: string; text: string };
    expect(markdown.text).toContain("@13800138000");
    expect(markdown.text).toContain(
      "[View in Kaneo](https://kaneo.example.com/task/1)",
    );
  });

  it("builds a DingTalk markdown payload with userId @mention", () => {
    const payload = buildDingTalkMarkdownPayload({
      title: "Task Assigned",
      body: "- **Task:** PROJ-1",
      atId: "manager789",
    });

    expect(payload.at).toEqual({
      atMobiles: [],
      atUserIds: ["manager789"],
      isAtAll: false,
    });
    const markdown = payload.markdown as { title: string; text: string };
    expect(markdown.text).toContain("@manager789");
  });
});
