import { isValidChatWebhookUrl } from "@/components/project/integrations/chat-webhook/is-valid-chat-webhook-url";
import type {
  CreateImIntegrationRequest,
  UpdateImIntegrationRequest,
} from "@/fetchers/im-integration/im-integration-client";
import type { ImWebhookFormValues } from "./im-webhook-form-values";
import type { ImWebhookProvider } from "./im-webhook-provider";

export type ImWebhookRequest =
  | { kind: "invalid" }
  | { kind: "create"; data: CreateImIntegrationRequest }
  | { kind: "update"; json: UpdateImIntegrationRequest };

export function buildImWebhookRequest(
  values: ImWebhookFormValues,
  connected: boolean,
  provider: Pick<ImWebhookProvider, "webhookUrlPattern">,
): ImWebhookRequest {
  const webhookUrl = values.webhookUrl.trim();
  const secret = values.secret.trim();
  const channelName = values.channelName.trim();
  const validUrl = isValidChatWebhookUrl(
    webhookUrl,
    provider.webhookUrlPattern,
  );

  if (!connected) {
    if (!validUrl) {
      return { kind: "invalid" };
    }

    return {
      kind: "create",
      data: {
        webhookUrl,
        secret: secret || undefined,
        channelName: channelName || undefined,
        events: values.events,
      },
    };
  }

  if (webhookUrl && !validUrl) {
    return { kind: "invalid" };
  }

  return {
    kind: "update",
    json: {
      webhookUrl: webhookUrl || undefined,
      secret: secret || undefined,
      channelName: channelName || null,
      events: values.events,
    },
  };
}
