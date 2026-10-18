import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

export type ImIntegrationPlatform = "feishu" | "lark" | "dingtalk";

export type ImIntegrationEvents = {
  taskCreated: boolean;
  taskStatusChanged: boolean;
  taskPriorityChanged: boolean;
  taskTitleChanged: boolean;
  taskDescriptionChanged: boolean;
  taskCommentCreated: boolean;
  taskAssigneeChanged: boolean;
  taskDueDateChanged: boolean;
};

export type ImIntegration = {
  id: string;
  projectId: string;
  channelName: string | null;
  webhookConfigured: boolean;
  maskedWebhookUrl: string;
  secretConfigured: boolean;
  maskedSecret: string | null;
  events: ImIntegrationEvents;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
} | null;

export type CreateImIntegrationRequest = {
  webhookUrl: string;
  secret?: string;
  channelName?: string;
  events?: Partial<ImIntegrationEvents>;
};

export type UpdateImIntegrationRequest = {
  webhookUrl?: string;
  secret?: string | null;
  channelName?: string | null;
  isActive?: boolean;
  events?: Partial<ImIntegrationEvents>;
};

function endpointPrefix(platform: ImIntegrationPlatform): string {
  return `/${platform}-integration/project`;
}

export async function getImIntegration(
  platform: ImIntegrationPlatform,
  projectId: string,
): Promise<ImIntegration> {
  const response = await fetch(
    getApiUrl(`${endpointPrefix(platform)}/${projectId}`),
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as ImIntegration;
}

export async function createImIntegration(
  platform: ImIntegrationPlatform,
  projectId: string,
  json: CreateImIntegrationRequest,
): Promise<ImIntegration> {
  const response = await fetch(
    getApiUrl(`${endpointPrefix(platform)}/${projectId}`),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as ImIntegration;
}

export async function updateImIntegration(
  platform: ImIntegrationPlatform,
  projectId: string,
  json: UpdateImIntegrationRequest,
): Promise<ImIntegration> {
  const response = await fetch(
    getApiUrl(`${endpointPrefix(platform)}/${projectId}`),
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as ImIntegration;
}

export async function deleteImIntegration(
  platform: ImIntegrationPlatform,
  projectId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(
    getApiUrl(`${endpointPrefix(platform)}/${projectId}`),
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as { success: boolean };
}
