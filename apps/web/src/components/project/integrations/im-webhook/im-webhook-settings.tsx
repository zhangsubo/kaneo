import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { PlugIcon, UnplugIcon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DeliveryActiveRow } from "@/components/project/integrations/delivery-panel/delivery-active-row";
import { DeliveryFooter } from "@/components/project/integrations/delivery-panel/delivery-footer";
import { DeliveryPanelSkeleton } from "@/components/project/integrations/delivery-panel/delivery-panel-skeleton";
import { EventChecklist } from "@/components/project/integrations/event-checklist/event-checklist";
import { IntegrationPanel } from "@/components/project/integrations/panel/integration-panel";
import { IntegrationPanelSection } from "@/components/project/integrations/panel/integration-panel-section";
import { Form, FormField } from "@/components/ui/form";
import { toast } from "@/lib/toast";
import { buildImWebhookRequest } from "./build-im-webhook-request";
import { IM_EVENT_ITEMS } from "./im-events";
import { ImWebhookFields } from "./im-webhook-fields";
import {
  type ImWebhookFormValues,
  imWebhookFormSchema,
  toImWebhookFormValues,
} from "./im-webhook-form-values";
import type { ImWebhookProvider } from "./im-webhook-provider";

type ImWebhookSettingsProps = {
  projectId: string;
  provider: ImWebhookProvider;
};

export function ImWebhookSettings({
  projectId,
  provider,
}: ImWebhookSettingsProps) {
  const { t } = useTranslation();
  const { data: integration, isLoading } = provider.useIntegration(projectId);
  const { mutateAsync: createIntegration, isPending: isCreating } =
    provider.useCreateIntegration();
  const { mutateAsync: updateIntegration, isPending: isUpdating } =
    provider.useUpdateIntegration();
  const { mutateAsync: deleteIntegration, isPending: isDeleting } =
    provider.useDeleteIntegration();
  const normalizedValues = React.useMemo(
    () => toImWebhookFormValues(integration),
    [integration],
  );

  const form = useForm<ImWebhookFormValues>({
    resolver: standardSchemaResolver(imWebhookFormSchema),
    defaultValues: toImWebhookFormValues(null),
  });
  const { reset } = form;
  const lastResetKeyRef = React.useRef<string | null>(null);
  const resetKey = `${projectId}:${integration?.id ?? "none"}`;

  React.useEffect(() => {
    if (form.formState.isDirty && lastResetKeyRef.current === resetKey) {
      return;
    }

    reset(normalizedValues);
    lastResetKeyRef.current = resetKey;
  }, [form.formState.isDirty, normalizedValues, reset, resetKey]);

  const isConnected = Boolean(integration?.webhookConfigured);
  const isBusy = isCreating || isUpdating || isDeleting;

  const onSubmit = async (values: ImWebhookFormValues) => {
    const request = buildImWebhookRequest(values, isConnected, provider);

    if (request.kind === "invalid") {
      form.setError("webhookUrl", { message: t(provider.keys.webhookInvalid) });
      return;
    }

    try {
      if (request.kind === "create") {
        await createIntegration({ projectId, data: request.data });
      } else {
        await updateIntegration({ projectId, json: request.json });
      }

      form.reset({ ...values, webhookUrl: "", secret: "" });
      toast.success(t(provider.keys.saved));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t(provider.keys.saveError),
      );
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    try {
      await updateIntegration({ projectId, json: { isActive: checked } });
      toast.success(
        checked ? t(provider.keys.enabled) : t(provider.keys.disabled),
        { icon: checked ? PlugIcon : UnplugIcon },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t(provider.keys.updateError),
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await deleteIntegration(projectId);
      form.reset(toImWebhookFormValues(null));
      toast.success(t(provider.keys.removed), { icon: UnplugIcon });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t(provider.keys.removeError),
      );
      return false;
    }
  };

  if (isLoading) {
    return <DeliveryPanelSkeleton />;
  }

  const providerName = t(provider.nameKey);

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <IntegrationPanel>
          <IntegrationPanelSection className="space-y-4">
            {isConnected ? (
              <DeliveryActiveRow
                checked={integration?.isActive ?? false}
                description={t("settings:chatIntegrations.activeDescription")}
                disabled={isBusy}
                onCheckedChange={handleToggleActive}
                title={t("settings:chatIntegrations.activeTitle", {
                  provider: providerName,
                })}
              />
            ) : null}
            <ImWebhookFields
              connected={isConnected}
              control={form.control}
              provider={provider}
              storedSecret={
                integration?.secretConfigured
                  ? (integration.maskedSecret ?? "••••")
                  : null
              }
            />
            <FormField
              control={form.control}
              name="events"
              render={({ field }) => (
                <EventChecklist
                  items={IM_EVENT_ITEMS}
                  label={t("settings:chatIntegrations.postWhen")}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          </IntegrationPanelSection>
          <DeliveryFooter
            busy={isBusy}
            connectLabel={t(provider.keys.connect)}
            connected={isConnected}
            disconnectDescription={t(
              "settings:chatIntegrations.disconnectDescription",
              { provider: providerName },
            )}
            disconnectTitle={t("settings:chatIntegrations.disconnectTitle", {
              provider: providerName,
            })}
            disconnecting={isDeleting}
            onDisconnect={handleDisconnect}
          />
        </IntegrationPanel>
      </form>
    </Form>
  );
}
