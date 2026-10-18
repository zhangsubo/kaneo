import { imIntegrationEventsSchema } from "../integrations/response";
import { responseTimestamp, z } from "../openapi";

export const feishuIntegrationSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    channelName: z.string().nullable(),
    webhookConfigured: z.boolean(),
    maskedWebhookUrl: z.string(),
    secretConfigured: z.boolean(),
    maskedSecret: z.string().nullable(),
    events: imIntegrationEventsSchema,
    isActive: z.boolean().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("FeishuIntegration");
