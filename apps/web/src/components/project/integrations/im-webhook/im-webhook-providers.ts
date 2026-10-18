import {
  useCreateImIntegration,
  useDeleteImIntegration,
  useUpdateImIntegration,
} from "@/hooks/mutations/im-integration/use-im-integration";
import {
  useGetDingtalkIntegration,
  useGetFeishuIntegration,
  useGetLarkIntegration,
} from "@/hooks/queries/im-integration/use-get-im-integration";
import type { ImWebhookProvider } from "./im-webhook-provider";

export const feishuChatProvider: ImWebhookProvider = {
  platform: "feishu",
  name: "Feishu",
  nameKey: "settings:projectIntegrations.feishuSectionTitle",
  webhookUrlPattern:
    /^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9_-]+$/i,
  keys: {
    webhookPlaceholder: "settings:feishuIntegration.webhookPlaceholder",
    webhookHint: "settings:feishuIntegration.webhookHint",
    webhookInvalid: "settings:feishuIntegration.validation.webhookInvalid",
    secretLabel: "settings:feishuIntegration.secretLabel",
    secretPlaceholder: "settings:feishuIntegration.secretPlaceholder",
    secretHint: "settings:feishuIntegration.secretHint",
    secretHintConfigured: "settings:feishuIntegration.secretHintConfigured",
    connect: "settings:feishuIntegration.connect",
    saved: "settings:feishuIntegration.toast.saved",
    saveError: "settings:feishuIntegration.toast.saveError",
    enabled: "settings:feishuIntegration.toast.enabled",
    disabled: "settings:feishuIntegration.toast.disabled",
    updateError: "settings:feishuIntegration.toast.updateError",
    removed: "settings:feishuIntegration.toast.removed",
    removeError: "settings:feishuIntegration.toast.removeError",
  },
  useIntegration: (projectId: string) => useGetFeishuIntegration(projectId),
  useCreateIntegration: () => useCreateImIntegration("feishu"),
  useUpdateIntegration: () => useUpdateImIntegration("feishu"),
  useDeleteIntegration: () => useDeleteImIntegration("feishu"),
};

export const larkChatProvider: ImWebhookProvider = {
  platform: "lark",
  name: "Lark",
  nameKey: "settings:projectIntegrations.larkSectionTitle",
  webhookUrlPattern:
    /^https:\/\/open\.larksuite\.com\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9_-]+$/i,
  keys: {
    webhookPlaceholder: "settings:larkIntegration.webhookPlaceholder",
    webhookHint: "settings:larkIntegration.webhookHint",
    webhookInvalid: "settings:larkIntegration.validation.webhookInvalid",
    secretLabel: "settings:larkIntegration.secretLabel",
    secretPlaceholder: "settings:larkIntegration.secretPlaceholder",
    secretHint: "settings:larkIntegration.secretHint",
    secretHintConfigured: "settings:larkIntegration.secretHintConfigured",
    connect: "settings:larkIntegration.connect",
    saved: "settings:larkIntegration.toast.saved",
    saveError: "settings:larkIntegration.toast.saveError",
    enabled: "settings:larkIntegration.toast.enabled",
    disabled: "settings:larkIntegration.toast.disabled",
    updateError: "settings:larkIntegration.toast.updateError",
    removed: "settings:larkIntegration.toast.removed",
    removeError: "settings:larkIntegration.toast.removeError",
  },
  useIntegration: (projectId: string) => useGetLarkIntegration(projectId),
  useCreateIntegration: () => useCreateImIntegration("lark"),
  useUpdateIntegration: () => useUpdateImIntegration("lark"),
  useDeleteIntegration: () => useDeleteImIntegration("lark"),
};

export const dingtalkChatProvider: ImWebhookProvider = {
  platform: "dingtalk",
  name: "DingTalk",
  nameKey: "settings:projectIntegrations.dingtalkSectionTitle",
  webhookUrlPattern:
    /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=[A-Za-z0-9_-]+$/i,
  keys: {
    webhookPlaceholder: "settings:dingtalkIntegration.webhookPlaceholder",
    webhookHint: "settings:dingtalkIntegration.webhookHint",
    webhookInvalid: "settings:dingtalkIntegration.validation.webhookInvalid",
    secretLabel: "settings:dingtalkIntegration.secretLabel",
    secretPlaceholder: "settings:dingtalkIntegration.secretPlaceholder",
    secretHint: "settings:dingtalkIntegration.secretHint",
    secretHintConfigured: "settings:dingtalkIntegration.secretHintConfigured",
    connect: "settings:dingtalkIntegration.connect",
    saved: "settings:dingtalkIntegration.toast.saved",
    saveError: "settings:dingtalkIntegration.toast.saveError",
    enabled: "settings:dingtalkIntegration.toast.enabled",
    disabled: "settings:dingtalkIntegration.toast.disabled",
    updateError: "settings:dingtalkIntegration.toast.updateError",
    removed: "settings:dingtalkIntegration.toast.removed",
    removeError: "settings:dingtalkIntegration.toast.removeError",
  },
  useIntegration: (projectId: string) => useGetDingtalkIntegration(projectId),
  useCreateIntegration: () => useCreateImIntegration("dingtalk"),
  useUpdateIntegration: () => useUpdateImIntegration("dingtalk"),
  useDeleteIntegration: () => useDeleteImIntegration("dingtalk"),
};
