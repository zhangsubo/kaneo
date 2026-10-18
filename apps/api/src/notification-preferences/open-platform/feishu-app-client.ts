import { resolveFileSecret } from "../../utils/file-secret";
import {
  OutboundRequestError,
  sendOutboundRequest,
} from "../../utils/outbound-request";

export type FeishuPlatform = "feishu" | "lark";

type CachedToken = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();
const mobileOpenIdCache = new Map<string, string>();

const MOBILE_PATTERN = /^\+?\d{7,15}$/;

export function getFeishuOpenPlatformBaseUrl(platform: FeishuPlatform): string {
  return platform === "lark"
    ? "https://open.larksuite.com"
    : "https://open.feishu.cn";
}

export function getFeishuAppCredentials(
  platform: FeishuPlatform,
): { appId: string; appSecret: string } | null {
  const appId =
    platform === "lark"
      ? process.env.LARK_APP_ID?.trim()
      : process.env.FEISHU_APP_ID?.trim();
  const appSecret =
    platform === "lark"
      ? resolveFileSecret("LARK_APP_SECRET")?.trim()
      : resolveFileSecret("FEISHU_APP_SECRET")?.trim();

  if (!appId || !appSecret) {
    return null;
  }

  return { appId, appSecret };
}

export function isFeishuAppConfigured(platform: FeishuPlatform): boolean {
  return getFeishuAppCredentials(platform) !== null;
}

export function clearFeishuAppTokenCache(): void {
  tokenCache.clear();
  mobileOpenIdCache.clear();
}

async function getTenantAccessToken(platform: FeishuPlatform): Promise<string> {
  const credentials = getFeishuAppCredentials(platform);
  if (!credentials) {
    throw new OutboundRequestError("destination");
  }

  const cacheKey = `${platform}:${credentials.appId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const baseUrl = getFeishuOpenPlatformBaseUrl(platform);
  const response = (await sendOutboundRequest(
    `${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: credentials.appId,
        app_secret: credentials.appSecret,
      }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 10_000 },
  )) as {
    code?: number;
    tenant_access_token?: string;
    expire?: number;
  } | null;

  if (
    !response ||
    response.code !== 0 ||
    typeof response.tenant_access_token !== "string"
  ) {
    throw new OutboundRequestError("response");
  }

  const expireSeconds =
    typeof response.expire === "number" ? response.expire : 7200;
  tokenCache.set(cacheKey, {
    token: response.tenant_access_token,
    expiresAt: Date.now() + expireSeconds * 1000,
  });

  return response.tenant_access_token;
}

async function resolveOpenIdByMobile(
  platform: FeishuPlatform,
  token: string,
  mobile: string,
): Promise<string> {
  const cacheKey = `${platform}:${mobile}`;
  const cached = mobileOpenIdCache.get(cacheKey);
  if (cached) return cached;

  const baseUrl = getFeishuOpenPlatformBaseUrl(platform);
  const response = (await sendOutboundRequest(
    `${baseUrl}/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobiles: [mobile],
      }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 10_000 },
  )) as {
    code?: number;
    data?: {
      user_list?: Array<{ user_id?: string }>;
    };
  } | null;

  const openId = response?.data?.user_list?.[0]?.user_id;
  if (!response || response.code !== 0 || !openId) {
    throw new OutboundRequestError("response");
  }

  mobileOpenIdCache.set(cacheKey, openId);
  return openId;
}

export async function sendFeishuAppDirectMessage(input: {
  platform: FeishuPlatform;
  atId?: string | null;
  userEmail?: string | null;
  card: Record<string, unknown>;
}): Promise<void> {
  const token = await getTenantAccessToken(input.platform);
  const trimmedAtId = input.atId?.trim();
  const trimmedEmail = input.userEmail?.trim();

  let receiveIdType: "open_id" | "user_id" | "email";
  let receiveId: string;

  if (trimmedAtId && trimmedAtId.toLowerCase() !== "all") {
    if (trimmedAtId.startsWith("ou_")) {
      receiveIdType = "open_id";
      receiveId = trimmedAtId;
    } else if (trimmedAtId.includes("@")) {
      receiveIdType = "email";
      receiveId = trimmedAtId;
    } else if (MOBILE_PATTERN.test(trimmedAtId)) {
      receiveIdType = "open_id";
      receiveId = await resolveOpenIdByMobile(
        input.platform,
        token,
        trimmedAtId,
      );
    } else {
      receiveIdType = "user_id";
      receiveId = trimmedAtId;
    }
  } else if (trimmedEmail) {
    receiveIdType = "email";
    receiveId = trimmedEmail;
  } else {
    throw new OutboundRequestError("destination");
  }

  const baseUrl = getFeishuOpenPlatformBaseUrl(input.platform);
  const response = (await sendOutboundRequest(
    `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "interactive",
        content: JSON.stringify(input.card),
      }),
    },
    { publicDestination: true, readJson: true, timeoutMs: 15_000 },
  )) as { code?: number } | null;

  if (!response || response.code !== 0) {
    throw new OutboundRequestError("response");
  }
}
