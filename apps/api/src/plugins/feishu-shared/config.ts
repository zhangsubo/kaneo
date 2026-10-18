import * as v from "valibot";
import { assertPublicWebhookDestination } from "../generic-webhook/config";
import { feishuWebhookUrlPattern, larkWebhookUrlPattern } from "./sender";

export const feishuEventKeys = [
  "taskCreated",
  "taskStatusChanged",
  "taskPriorityChanged",
  "taskTitleChanged",
  "taskDescriptionChanged",
  "taskCommentCreated",
  "taskAssigneeChanged",
  "taskDueDateChanged",
] as const;

export type FeishuEventKey = (typeof feishuEventKeys)[number];

const eventsSchema = v.optional(
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
);

export const feishuConfigSchema = v.object({
  webhookUrl: v.pipe(
    v.string(),
    v.regex(feishuWebhookUrlPattern, "Invalid Feishu bot webhook URL"),
  ),
  secret: v.optional(v.string()),
  channelName: v.optional(v.string()),
  events: eventsSchema,
});

export const larkConfigSchema = v.object({
  webhookUrl: v.pipe(
    v.string(),
    v.regex(larkWebhookUrlPattern, "Invalid Lark bot webhook URL"),
  ),
  secret: v.optional(v.string()),
  channelName: v.optional(v.string()),
  events: eventsSchema,
});

export type FeishuConfig = v.InferOutput<typeof feishuConfigSchema>;
export type LarkConfig = v.InferOutput<typeof larkConfigSchema>;

export const defaultFeishuEvents: Record<FeishuEventKey, boolean> = {
  taskCreated: true,
  taskStatusChanged: true,
  taskPriorityChanged: false,
  taskTitleChanged: false,
  taskDescriptionChanged: false,
  taskCommentCreated: true,
  taskAssigneeChanged: true,
  taskDueDateChanged: false,
};

export function normalizeFeishuLikeConfig(config: FeishuConfig): FeishuConfig {
  const secret =
    typeof config.secret === "string"
      ? config.secret.trim() || undefined
      : undefined;

  return {
    ...config,
    secret,
    channelName: config.channelName?.trim() || undefined,
    events: {
      ...defaultFeishuEvents,
      ...config.events,
    },
  };
}

export async function validateFeishuConfig(
  config: unknown,
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const parsed = v.parse(feishuConfigSchema, config);
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

export async function validateLarkConfig(
  config: unknown,
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const parsed = v.parse(larkConfigSchema, config);
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
