import { feishuChatProvider } from "@/components/project/integrations/im-webhook/im-webhook-providers";
import { ImWebhookSettings } from "@/components/project/integrations/im-webhook/im-webhook-settings";

export function FeishuIntegrationSettings({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <ImWebhookSettings projectId={projectId} provider={feishuChatProvider} />
  );
}
