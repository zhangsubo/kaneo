import type { NotificationPreferences } from "@/fetchers/notification-preferences/get-notification-preferences";
import type {
  ChannelAvailability,
  ChannelAvailabilityMap,
} from "./notification-channels";

type ChannelPreferences = Pick<
  NotificationPreferences,
  | "emailAddress"
  | "emailEnabled"
  | "feishuConfigured"
  | "feishuEnabled"
  | "larkConfigured"
  | "larkEnabled"
  | "dingtalkConfigured"
  | "dingtalkEnabled"
  | "gotifyConfigured"
  | "gotifyEnabled"
  | "ntfyConfigured"
  | "ntfyEnabled"
  | "webhookConfigured"
  | "webhookEnabled"
>;

function getExternalAvailability(
  configured: boolean | undefined,
  enabled: boolean | undefined,
): ChannelAvailability {
  if (!configured) return "notConnected";
  return enabled ? "available" : "paused";
}

export function getChannelAvailability(
  preferences: ChannelPreferences,
): ChannelAvailabilityMap {
  return {
    email: !preferences.emailAddress
      ? "notConnected"
      : preferences.emailEnabled
        ? "available"
        : "off",
    feishu: getExternalAvailability(
      preferences.feishuConfigured,
      preferences.feishuEnabled,
    ),
    lark: getExternalAvailability(
      preferences.larkConfigured,
      preferences.larkEnabled,
    ),
    dingtalk: getExternalAvailability(
      preferences.dingtalkConfigured,
      preferences.dingtalkEnabled,
    ),
    gotify: getExternalAvailability(
      preferences.gotifyConfigured,
      preferences.gotifyEnabled,
    ),
    ntfy: getExternalAvailability(
      preferences.ntfyConfigured,
      preferences.ntfyEnabled,
    ),
    webhook: getExternalAvailability(
      preferences.webhookConfigured,
      preferences.webhookEnabled,
    ),
  };
}
