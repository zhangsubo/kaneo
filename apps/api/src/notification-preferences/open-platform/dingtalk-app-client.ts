import { resolveFileSecret } from "../../utils/file-secret";
import {
  OutboundRequestError,
  sendOutboundRequest,
} from "../../utils/outbound-request";

type CachedDingTalkToken = {
  token: string;
  expiresAt: number;
};

let tokenCache: (CachedDingTalkToken & { appKey: string }) | null = null;
const mobileUserIdCache = new Map<string, string>();

const MOBILE_PATTERN = /^\+?\d{7,15}$/;

export function getDingTalkAppCredentials(): {
  appKey: string;
  appSecret: string;
  robotCode: string;
} | null {
  const appKey = process.env.DINGTALK_APP_KEY?.trim();
  const appSecret = resolveFileSecret("DINGTALK_APP_SECRET")?.trim();
  const robotCode = process.env.DINGTALK_ROBOT_CODE?.trim() || appKey;

  if (!appKey || !appSecret || !robotCode) {
    return null;
  }

  return { appKey, appSecret, robotCode };
}

export function isDingTalkAppConfigured(): boolean {
  return getDingTalkAppCredentials() !== null;
}

export function clearDingTalkAppTokenCache(): void {
  tokenCache = null;
  mobileUserIdCache.clear();
}

async function getDingTalkAccessToken(): Promise<{
  token: string;
  robotCode: string;
}> {
  const credentials = getDingTalkAppCredentials();
  if (!credentials) {
    throw new OutboundRequestError("destination");
  }

  if (
    tokenCache &&
    tokenCache.appKey === credentials.appKey &&
    tokenCache.expiresAt > Date.now() + 60_000
  ) {
    return { token: tokenCache.token, robotCode: credentials.robotCode };
  }

  const response = (await sendOutboundRequest(
    "https://api.dingtalk.com/v1.0/oauth2/accessToken",
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
      }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 10_000 },
  )) as {
    accessToken?: string;
    expireIn?: number;
  } | null;

  if (!response || typeof response.accessToken !== "string") {
    throw new OutboundRequestError("response");
  }

  const expireSeconds =
    typeof response.expireIn === "number" ? response.expireIn : 7200;
  tokenCache = {
    appKey: credentials.appKey,
    token: response.accessToken,
    expiresAt: Date.now() + expireSeconds * 1000,
  };

  return { token: response.accessToken, robotCode: credentials.robotCode };
}

async function resolveDingTalkUserIdByMobile(
  token: string,
  mobile: string,
): Promise<string> {
  const normalizedMobile = mobile.replace(/^\+?86/, "");
  const cached = mobileUserIdCache.get(normalizedMobile);
  if (cached) return cached;

  const response = (await sendOutboundRequest(
    `https://oapi.dingtalk.com/topapi/v2/user/getbymobile?access_token=${encodeURIComponent(token)}`,
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: normalizedMobile }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 10_000 },
  )) as {
    errcode?: number;
    result?: { userid?: string };
  } | null;

  const userId = response?.result?.userid;
  if (!response || response.errcode !== 0 || !userId) {
    throw new OutboundRequestError("response");
  }

  mobileUserIdCache.set(normalizedMobile, userId);
  return userId;
}

export async function sendDingTalkAppDirectMessage(input: {
  atId?: string | null;
  title: string;
  markdownText: string;
}): Promise<void> {
  const trimmedAtId = input.atId?.trim();
  if (!trimmedAtId || trimmedAtId.toLowerCase() === "all") {
    throw new OutboundRequestError("destination");
  }

  const { token, robotCode } = await getDingTalkAccessToken();
  const userId = MOBILE_PATTERN.test(trimmedAtId)
    ? await resolveDingTalkUserIdByMobile(token, trimmedAtId)
    : trimmedAtId;

  const response = (await sendOutboundRequest(
    "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend",
    {
      headers: {
        "x-acs-dingtalk-access-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        robotCode,
        userIds: [userId],
        msgKey: "sampleMarkdown",
        msgParam: JSON.stringify({
          title: input.title,
          text: input.markdownText,
        }),
      }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 15_000 },
  )) as { processQueryKey?: string; code?: string } | null;

  if (!response || ("code" in response && Boolean(response.code))) {
    throw new OutboundRequestError("response");
  }
}
