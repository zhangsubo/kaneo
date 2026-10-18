export type ExternalChannelId =
  | "gotify"
  | "ntfy"
  | "webhook"
  | "feishu"
  | "lark"
  | "dingtalk";

export type NotificationChannelId = "email" | ExternalChannelId;

export type ChannelAvailability =
  | "available"
  | "paused"
  | "off"
  | "notConnected";

export type ChannelAvailabilityMap = Record<
  NotificationChannelId,
  ChannelAvailability
>;

export const NOTIFICATION_CHANNELS: NotificationChannelId[] = [
  "email",
  "feishu",
  "lark",
  "dingtalk",
  "gotify",
  "ntfy",
  "webhook",
];

export const CHANNEL_NAME_KEYS: Record<NotificationChannelId, string> = {
  email: "settings:notificationsPage.emailTitle",
  feishu: "settings:notificationsPage.feishuTitle",
  lark: "settings:notificationsPage.larkTitle",
  dingtalk: "settings:notificationsPage.dingtalkTitle",
  gotify: "settings:notificationsPage.gotifyTitle",
  ntfy: "settings:notificationsPage.ntfyTitle",
  webhook: "settings:notificationsPage.webhookTitle",
};
