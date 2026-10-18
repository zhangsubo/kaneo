import { getApiUrl } from "@/fetchers/get-api-url";

import { HttpError } from "@/lib/http-error";
export type NotificationPreferenceWorkspaceRule = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  isActive: boolean;
  emailEnabled: boolean;
  ntfyEnabled: boolean;
  gotifyEnabled: boolean;
  webhookEnabled: boolean;
  feishuEnabled?: boolean;
  larkEnabled?: boolean;
  dingtalkEnabled?: boolean;
  projectMode: "all" | "selected";
  selectedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferences = {
  emailAddress: string | null;
  emailEnabled: boolean;
  ntfyEnabled: boolean;
  ntfyConfigured: boolean;
  ntfyServerUrl: string | null;
  ntfyTopic: string | null;
  ntfyTokenConfigured: boolean;
  maskedNtfyToken: string | null;
  gotifyEnabled: boolean;
  gotifyConfigured: boolean;
  gotifyServerUrl: string | null;
  gotifyTokenConfigured: boolean;
  maskedGotifyToken: string | null;
  webhookEnabled: boolean;
  webhookConfigured: boolean;
  webhookUrl: string | null;
  webhookSecretConfigured: boolean;
  maskedWebhookSecret: string | null;
  feishuEnabled?: boolean;
  feishuConfigured?: boolean;
  feishuWebhookUrl?: string | null;
  feishuSecretConfigured?: boolean;
  maskedFeishuSecret?: string | null;
  feishuAtId?: string | null;
  larkEnabled?: boolean;
  larkConfigured?: boolean;
  larkWebhookUrl?: string | null;
  larkSecretConfigured?: boolean;
  maskedLarkSecret?: string | null;
  larkAtId?: string | null;
  dingtalkEnabled?: boolean;
  dingtalkConfigured?: boolean;
  dingtalkWebhookUrl?: string | null;
  dingtalkSecretConfigured?: boolean;
  maskedDingtalkSecret?: string | null;
  dingtalkAtId?: string | null;
  taskAssignmentEnabled: boolean;
  taskCommentEnabled: boolean;
  taskStatusChangeEnabled: boolean;
  dueDateReminderEnabled: boolean;
  dueDateReminderLeadTimeMinutes: number;
  workspaces: NotificationPreferenceWorkspaceRule[];
  createdAt: string | null;
  updatedAt: string | null;
};

async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch(getApiUrl("/notification-preferences"), {
    credentials: "include",
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as NotificationPreferences;
}

export default getNotificationPreferences;
