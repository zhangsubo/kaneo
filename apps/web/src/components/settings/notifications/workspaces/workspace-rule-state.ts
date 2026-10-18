import type { NotificationPreferenceWorkspaceRule } from "@/fetchers/notification-preferences/get-notification-preferences";
import type { UpsertNotificationWorkspaceRuleRequest } from "@/fetchers/notification-preferences/upsert-notification-workspace-rule";
import type {
  ChannelAvailabilityMap,
  NotificationChannelId,
} from "../notification-channels";

export type WorkspaceRule = Pick<
  NotificationPreferenceWorkspaceRule,
  | "isActive"
  | "emailEnabled"
  | "feishuEnabled"
  | "larkEnabled"
  | "dingtalkEnabled"
  | "gotifyEnabled"
  | "ntfyEnabled"
  | "webhookEnabled"
  | "projectMode"
  | "selectedProjectIds"
>;

export type WorkspaceRuleState = {
  isActive: boolean;
  emailEnabled: boolean;
  feishuEnabled: boolean;
  larkEnabled: boolean;
  dingtalkEnabled: boolean;
  gotifyEnabled: boolean;
  ntfyEnabled: boolean;
  webhookEnabled: boolean;
  projectMode: "all" | "selected";
  selectedProjectIds: string[];
};

export const RULE_CHANNEL_KEYS = {
  email: "emailEnabled",
  feishu: "feishuEnabled",
  lark: "larkEnabled",
  dingtalk: "dingtalkEnabled",
  gotify: "gotifyEnabled",
  ntfy: "ntfyEnabled",
  webhook: "webhookEnabled",
} as const satisfies Record<NotificationChannelId, keyof WorkspaceRuleState>;

export function createWorkspaceRuleState(
  rule: WorkspaceRule | undefined,
  availability: ChannelAvailabilityMap,
): WorkspaceRuleState {
  if (rule) {
    return {
      isActive: rule.isActive,
      emailEnabled: rule.emailEnabled,
      feishuEnabled: rule.feishuEnabled ?? false,
      larkEnabled: rule.larkEnabled ?? false,
      dingtalkEnabled: rule.dingtalkEnabled ?? false,
      gotifyEnabled: rule.gotifyEnabled,
      ntfyEnabled: rule.ntfyEnabled,
      webhookEnabled: rule.webhookEnabled,
      projectMode: rule.projectMode,
      selectedProjectIds: rule.selectedProjectIds,
    };
  }

  return {
    isActive: true,
    emailEnabled: availability.email === "available",
    feishuEnabled: availability.feishu === "available",
    larkEnabled: availability.lark === "available",
    dingtalkEnabled: availability.dingtalk === "available",
    gotifyEnabled: availability.gotify === "available",
    ntfyEnabled: availability.ntfy === "available",
    webhookEnabled: availability.webhook === "available",
    projectMode: "all",
    selectedProjectIds: [],
  };
}

export function toWorkspaceRuleRequest(
  state: WorkspaceRuleState,
  availability: ChannelAvailabilityMap,
): UpsertNotificationWorkspaceRuleRequest {
  return {
    isActive: state.isActive,
    emailEnabled: state.emailEnabled && availability.email === "available",
    feishuEnabled: state.feishuEnabled && availability.feishu === "available",
    larkEnabled: state.larkEnabled && availability.lark === "available",
    dingtalkEnabled:
      state.dingtalkEnabled && availability.dingtalk === "available",
    gotifyEnabled: state.gotifyEnabled && availability.gotify === "available",
    ntfyEnabled: state.ntfyEnabled && availability.ntfy === "available",
    webhookEnabled:
      state.webhookEnabled && availability.webhook === "available",
    projectMode: state.projectMode,
    selectedProjectIds: state.selectedProjectIds,
  };
}
