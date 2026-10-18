import { z } from "zod/v4";
import type {
  ImIntegration,
  ImIntegrationEvents,
} from "@/fetchers/im-integration/im-integration-client";
import { toImEvents } from "./im-events";

export type ImWebhookFormValues = {
  webhookUrl: string;
  secret: string;
  channelName: string;
  events: ImIntegrationEvents;
};

export const imWebhookFormSchema = z.object({
  webhookUrl: z.string(),
  secret: z.string(),
  channelName: z.string(),
  events: z.object({
    taskCreated: z.boolean(),
    taskStatusChanged: z.boolean(),
    taskPriorityChanged: z.boolean(),
    taskTitleChanged: z.boolean(),
    taskDescriptionChanged: z.boolean(),
    taskCommentCreated: z.boolean(),
    taskAssigneeChanged: z.boolean(),
    taskDueDateChanged: z.boolean(),
  }),
});

export function toImWebhookFormValues(
  integration: ImIntegration | undefined,
): ImWebhookFormValues {
  return {
    webhookUrl: "",
    secret: "",
    channelName: integration?.channelName ?? "",
    events: toImEvents(integration?.events),
  };
}
