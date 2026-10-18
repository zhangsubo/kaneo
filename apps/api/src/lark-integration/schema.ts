import { imIntegrationEventToggles } from "../integrations/schema";
import { z } from "../openapi";

export const createLarkBody = z.object({
  webhookUrl: z.string().min(1),
  secret: z.string().optional().openapi({
    description: "Optional signing secret for the Lark custom bot.",
  }),
  channelName: z.string().optional(),
  events: imIntegrationEventToggles.optional(),
});

export const updateLarkBody = z.object({
  webhookUrl: z.string().optional(),
  secret: z.string().nullable().optional().openapi({
    description: "Send null to remove the signing secret.",
  }),
  channelName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  events: imIntegrationEventToggles.optional(),
});
