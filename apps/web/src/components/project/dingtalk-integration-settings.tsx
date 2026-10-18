import { dingtalkChatProvider } from "@/components/project/integrations/im-webhook/im-webhook-providers";
import { ImWebhookSettings } from "@/components/project/integrations/im-webhook/im-webhook-settings";

export function DingtalkIntegrationSettings({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <ImWebhookSettings projectId={projectId} provider={dingtalkChatProvider} />
  );
}
