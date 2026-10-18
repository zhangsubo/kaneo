import * as v from "valibot";
import { assertPublicWebhookDestination } from "../generic-webhook/config";
import { dingtalkWebhookUrlPattern } from "./sender";

export const dingtalkEventKeys = [
  "taskCreated",
  "taskStatusChanged",
  "taskPriorityChanged",
  "taskTitleChanged",
  "taskDescriptionChanged",
  "taskCommentCreated",
  "taskAssigneeChanged",
  "taskDueDateChanged",
] as const;

export type DingTalkEventKey = (typeof dingtalkEventKeys)[number];

export const dingtalkConfigSchema = v.object({
  webhookUrl: v.pipe(
    v.string(),
    v.regex(dingtalkWebhookUrlPattern, "Invalid DingTalk bot webhook URL"),
  ),
  secret: v.optional(v.string()),
  channelName: v.optional(v.string()),
  events: v.optional(
    v.object({
      taskCreated: v.optional(v.boolean()),
      taskStatusChanged: v.optional(v.boolean()),
      taskPriorityChanged: v.optional(v.boolean()),
      taskTitleChanged: v.optional(v.boolean()),
      taskDescriptionChanged: v.optional(v.boolean()),
      taskCommentCreated: v.optional(v.boolean()),
      taskAssigneeChanged: v.optional(v.boolean()),
      taskDueDateChanged: v.optional(v.boolean()),
    }),
  ),
});

export type DingTalkConfig = v.InferOutput<typeof dingtalkConfigSchema>;

export const defaultDingTalkEvents: Record<DingTalkEventKey, boolean> = {
  taskCreated: true,
  taskStatusChanged: true,
  taskPriorityChanged: false,
  taskTitleChanged: false,
  taskDescriptionChanged: false,
  taskCommentCreated: true,
  taskAssigneeChanged: true,
  taskDueDateChanged: false,
};

export function normalizeDingTalkConfig(
  config: DingTalkConfig,
): DingTalkConfig {
  const secret =
    typeof config.secret === "string"
      ? config.secret.trim() || undefined
      : undefined;

  return {
    ...config,
    secret,
    channelName: config.channelName?.trim() || undefined,
    events: {
      ...defaultDingTalkEvents,
      ...config.events,
    },
  };
}

export async function validateDingTalkConfig(
  config: unknown,
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const parsed = v.parse(dingtalkConfigSchema, config);
    await assertPublicWebhookDestination(parsed.webhookUrl);
    return { valid: true };
  } catch (error) {
    if (error instanceof v.ValiError) {
      return {
        valid: false,
        errors: error.issues.map((issue) => issue.message),
      };
    }

    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Invalid config"],
    };
  }
}
