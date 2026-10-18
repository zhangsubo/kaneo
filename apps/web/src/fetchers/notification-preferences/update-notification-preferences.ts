import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";
import type { NotificationPreferences } from "./get-notification-preferences";

export type UpdateNotificationPreferencesRequest = {
  emailEnabled?: boolean;
  ntfyEnabled?: boolean;
  ntfyServerUrl?: string | null;
  ntfyTopic?: string | null;
  ntfyToken?: string | null;
  gotifyEnabled?: boolean;
  gotifyServerUrl?: string | null;
  gotifyToken?: string | null;
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  feishuEnabled?: boolean;
  feishuWebhookUrl?: string | null;
  feishuSecret?: string | null;
  feishuAtId?: string | null;
  larkEnabled?: boolean;
  larkWebhookUrl?: string | null;
  larkSecret?: string | null;
  larkAtId?: string | null;
  dingtalkEnabled?: boolean;
  dingtalkWebhookUrl?: string | null;
  dingtalkSecret?: string | null;
  dingtalkAtId?: string | null;
  taskAssignmentEnabled?: boolean;
  taskCommentEnabled?: boolean;
  taskStatusChangeEnabled?: boolean;
  dueDateReminderEnabled?: boolean;
  dueDateReminderLeadTimeMinutes?: number;
};

async function updateNotificationPreferences(
  json: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
  const response = await fetch(getApiUrl("/notification-preferences"), {
    body: JSON.stringify(json),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as NotificationPreferences;
}

export default updateNotificationPreferences;
