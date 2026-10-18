import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import type { NotificationPreferences } from "@/fetchers/notification-preferences/get-notification-preferences";
import type { UpdateNotificationPreferencesRequest } from "@/fetchers/notification-preferences/update-notification-preferences";
import { useUpdateNotificationPreferences } from "@/hooks/mutations/notification-preferences/use-notification-preferences";
import { ChannelField } from "./channel-field";
import { ChannelPanelFooter } from "./channel-panel-footer";
import { ChannelSendingRow } from "./channel-sending-row";

export type ImBotChannelId = "feishu" | "lark" | "dingtalk";

type ImBotChannelPanelProps = {
  channel: ImBotChannelId;
  preferences: NotificationPreferences;
  onDisconnected: () => void;
};

type ImChannelConfig = {
  titleKey: string;
  urlPlaceholderKey: string;
  atIdLabelKey: string;
  atIdPlaceholderKey: string;
  atIdHintKey: string;
  connectLabelKey: string;
  getState: (prefs: NotificationPreferences) => {
    configured: boolean;
    enabled: boolean;
    webhookUrl: string;
    secretConfigured: boolean;
    maskedSecret: string | null;
    atId: string;
  };
  buildUpdate: (input: {
    enabled?: boolean;
    webhookUrl: string | null;
    secret: string | null | undefined;
    atId: string | null;
  }) => UpdateNotificationPreferencesRequest;
};

const IM_CHANNEL_CONFIGS: Record<ImBotChannelId, ImChannelConfig> = {
  feishu: {
    titleKey: "settings:notificationsPage.feishuTitle",
    urlPlaceholderKey: "settings:notificationsPage.feishuWebhookUrlPlaceholder",
    atIdLabelKey: "settings:notificationsPage.feishuAtIdLabel",
    atIdPlaceholderKey: "settings:notificationsPage.feishuAtIdPlaceholder",
    atIdHintKey: "settings:notificationsPage.feishuAtIdHint",
    connectLabelKey: "settings:notificationsPage.connectFeishu",
    getState: (prefs) => ({
      configured: Boolean(prefs.feishuConfigured),
      enabled: Boolean(prefs.feishuEnabled),
      webhookUrl: prefs.feishuWebhookUrl ?? "",
      secretConfigured: Boolean(prefs.feishuSecretConfigured),
      maskedSecret: prefs.maskedFeishuSecret ?? null,
      atId: prefs.feishuAtId ?? "",
    }),
    buildUpdate: ({ enabled, webhookUrl, secret, atId }) => ({
      ...(enabled !== undefined ? { feishuEnabled: enabled } : {}),
      feishuWebhookUrl: webhookUrl,
      ...(secret !== undefined ? { feishuSecret: secret } : {}),
      feishuAtId: atId,
    }),
  },
  lark: {
    titleKey: "settings:notificationsPage.larkTitle",
    urlPlaceholderKey: "settings:notificationsPage.larkWebhookUrlPlaceholder",
    atIdLabelKey: "settings:notificationsPage.larkAtIdLabel",
    atIdPlaceholderKey: "settings:notificationsPage.larkAtIdPlaceholder",
    atIdHintKey: "settings:notificationsPage.larkAtIdHint",
    connectLabelKey: "settings:notificationsPage.connectLark",
    getState: (prefs) => ({
      configured: Boolean(prefs.larkConfigured),
      enabled: Boolean(prefs.larkEnabled),
      webhookUrl: prefs.larkWebhookUrl ?? "",
      secretConfigured: Boolean(prefs.larkSecretConfigured),
      maskedSecret: prefs.maskedLarkSecret ?? null,
      atId: prefs.larkAtId ?? "",
    }),
    buildUpdate: ({ enabled, webhookUrl, secret, atId }) => ({
      ...(enabled !== undefined ? { larkEnabled: enabled } : {}),
      larkWebhookUrl: webhookUrl,
      ...(secret !== undefined ? { larkSecret: secret } : {}),
      larkAtId: atId,
    }),
  },
  dingtalk: {
    titleKey: "settings:notificationsPage.dingtalkTitle",
    urlPlaceholderKey:
      "settings:notificationsPage.dingtalkWebhookUrlPlaceholder",
    atIdLabelKey: "settings:notificationsPage.dingtalkAtIdLabel",
    atIdPlaceholderKey: "settings:notificationsPage.dingtalkAtIdPlaceholder",
    atIdHintKey: "settings:notificationsPage.dingtalkAtIdHint",
    connectLabelKey: "settings:notificationsPage.connectDingtalk",
    getState: (prefs) => ({
      configured: Boolean(prefs.dingtalkConfigured),
      enabled: Boolean(prefs.dingtalkEnabled),
      webhookUrl: prefs.dingtalkWebhookUrl ?? "",
      secretConfigured: Boolean(prefs.dingtalkSecretConfigured),
      maskedSecret: prefs.maskedDingtalkSecret ?? null,
      atId: prefs.dingtalkAtId ?? "",
    }),
    buildUpdate: ({ enabled, webhookUrl, secret, atId }) => ({
      ...(enabled !== undefined ? { dingtalkEnabled: enabled } : {}),
      dingtalkWebhookUrl: webhookUrl,
      ...(secret !== undefined ? { dingtalkSecret: secret } : {}),
      dingtalkAtId: atId,
    }),
  },
};

export function ImBotChannelPanel({
  channel,
  preferences,
  onDisconnected,
}: ImBotChannelPanelProps) {
  const { t } = useTranslation();
  const urlId = useId();
  const secretId = useId();
  const atIdFieldId = useId();
  const { mutateAsync, isPending } = useUpdateNotificationPreferences();

  const config = IM_CHANNEL_CONFIGS[channel];
  const state = config.getState(preferences);

  const [url, setUrl] = useState(state.webhookUrl);
  const [secret, setSecret] = useState("");
  const [atId, setAtId] = useState(state.atId);

  const canSubmit = url.trim() !== "" || atId.trim() !== "";

  const submit = async () => {
    const saved = await mutateAsync(
      config.buildUpdate({
        enabled: state.configured ? undefined : true,
        webhookUrl: url.trim() ? url.trim() : null,
        secret: secret.trim() ? secret.trim() : undefined,
        atId: atId.trim() ? atId.trim() : null,
      }),
    ).then(
      () => true,
      () => false,
    );
    if (saved) setSecret("");
  };

  const disconnect = async () => {
    await mutateAsync(
      config.buildUpdate({
        enabled: false,
        webhookUrl: null,
        secret: null,
        atId: null,
      }),
    );
    onDisconnected();
  };

  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ChannelField
          id={urlId}
          label={t("settings:notificationsPage.endpointUrl")}
        >
          <Input
            autoComplete="off"
            id={urlId}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t(config.urlPlaceholderKey)}
            size="sm"
            type="url"
            value={url}
          />
        </ChannelField>
        <ChannelField
          id={secretId}
          label={t("settings:notificationsPage.signingSecret")}
          optional
          hint={
            state.secretConfigured
              ? t("settings:notificationsPage.webhookSecretHintConfigured", {
                  masked: state.maskedSecret ?? "••••",
                })
              : t("settings:notificationsPage.imBotSecretHint")
          }
        >
          <Input
            autoComplete="off"
            id={secretId}
            onChange={(event) => setSecret(event.target.value)}
            placeholder={t(
              "settings:notificationsPage.webhookSecretPlaceholder",
            )}
            size="sm"
            type="password"
            value={secret}
          />
        </ChannelField>
      </div>
      <ChannelField
        id={atIdFieldId}
        label={t(config.atIdLabelKey)}
        optional
        hint={t(config.atIdHintKey)}
      >
        <Input
          autoComplete="off"
          id={atIdFieldId}
          onChange={(event) => setAtId(event.target.value)}
          placeholder={t(config.atIdPlaceholderKey)}
          size="sm"
          type="text"
          value={atId}
        />
      </ChannelField>
      {state.configured ? (
        <ChannelSendingRow channel={channel} enabled={state.enabled} />
      ) : null}
      <ChannelPanelFooter
        channelName={t(config.titleKey)}
        configured={state.configured}
        onDisconnect={disconnect}
        submitDisabled={isPending || !canSubmit}
        submitLabel={
          state.configured
            ? t("settings:notificationsPage.saveChanges")
            : t(config.connectLabelKey)
        }
      />
    </form>
  );
}
