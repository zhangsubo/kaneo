import { and, eq, inArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectTable,
  userNotificationPreferenceTable,
  userNotificationWorkspaceProjectTable,
  userNotificationWorkspaceRuleTable,
  workspaceUserTable,
} from "../database/schema";
import { dingtalkWebhookUrlPattern } from "../plugins/dingtalk/sender";
import {
  feishuWebhookUrlPattern,
  larkWebhookUrlPattern,
} from "../plugins/feishu-shared/sender";
import { assertPublicWebhookDestination } from "../plugins/generic-webhook/config";
import { findInaccessibleProjectIds } from "../project-access/find-inaccessible-project-ids";
import { projectAccessCondition } from "../project-access/project-access-condition";
import { findHiddenRuleProjectIds } from "./find-hidden-rule-project-ids";
import { isDingTalkAppConfigured } from "./open-platform/dingtalk-app-client";
import { isFeishuAppConfigured } from "./open-platform/feishu-app-client";
import { decryptSecret, encryptSecret } from "./secrets";

export type NotificationPreferenceProjectMode = "all" | "selected";

export type NotificationPreferenceResponse = {
  emailAddress: string | null;
  emailEnabled: boolean;
  ntfyEnabled: boolean;
  ntfyConfigured: boolean;
  ntfyServerUrl: string | null;
  ntfyTopic: string | null;
  ntfyTokenConfigured: boolean;
  maskedNtfyToken: string | null;
  gotifyEnabled: boolean;
  gotifyConfigured: boolean;
  gotifyServerUrl: string | null;
  gotifyTokenConfigured: boolean;
  maskedGotifyToken: string | null;
  webhookEnabled: boolean;
  webhookConfigured: boolean;
  webhookUrl: string | null;
  webhookSecretConfigured: boolean;
  maskedWebhookSecret: string | null;
  feishuEnabled: boolean;
  feishuConfigured: boolean;
  feishuWebhookUrl: string | null;
  feishuSecretConfigured: boolean;
  maskedFeishuSecret: string | null;
  feishuAtId: string | null;
  larkEnabled: boolean;
  larkConfigured: boolean;
  larkWebhookUrl: string | null;
  larkSecretConfigured: boolean;
  maskedLarkSecret: string | null;
  larkAtId: string | null;
  dingtalkEnabled: boolean;
  dingtalkConfigured: boolean;
  dingtalkWebhookUrl: string | null;
  dingtalkSecretConfigured: boolean;
  maskedDingtalkSecret: string | null;
  dingtalkAtId: string | null;
  taskAssignmentEnabled: boolean;
  taskCommentEnabled: boolean;
  taskStatusChangeEnabled: boolean;
  dueDateReminderEnabled: boolean;
  dueDateReminderLeadTimeMinutes: number;
  workspaces: Array<{
    id: string;
    workspaceId: string;
    workspaceName: string;
    isActive: boolean;
    emailEnabled: boolean;
    ntfyEnabled: boolean;
    gotifyEnabled: boolean;
    webhookEnabled: boolean;
    feishuEnabled: boolean;
    larkEnabled: boolean;
    dingtalkEnabled: boolean;
    projectMode: NotificationPreferenceProjectMode;
    selectedProjectIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UpdateNotificationPreferenceInput = {
  emailEnabled?: boolean;
  ntfyEnabled?: boolean;
  ntfyServerUrl?: string | null;
  ntfyTopic?: string | null;
  ntfyToken?: string | null;
  gotifyEnabled?: boolean;
  gotifyServerUrl?: string | null;
  gotifyToken?: string | null;
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  feishuEnabled?: boolean;
  feishuWebhookUrl?: string | null;
  feishuSecret?: string | null;
  feishuAtId?: string | null;
  larkEnabled?: boolean;
  larkWebhookUrl?: string | null;
  larkSecret?: string | null;
  larkAtId?: string | null;
  dingtalkEnabled?: boolean;
  dingtalkWebhookUrl?: string | null;
  dingtalkSecret?: string | null;
  dingtalkAtId?: string | null;
  taskAssignmentEnabled?: boolean;
  taskCommentEnabled?: boolean;
  taskStatusChangeEnabled?: boolean;
  dueDateReminderEnabled?: boolean;
  dueDateReminderLeadTimeMinutes?: number;
};

export type UpsertWorkspaceRuleInput = {
  isActive: boolean;
  emailEnabled: boolean;
  ntfyEnabled: boolean;
  gotifyEnabled: boolean;
  webhookEnabled: boolean;
  feishuEnabled?: boolean;
  larkEnabled?: boolean;
  dingtalkEnabled?: boolean;
  projectMode: NotificationPreferenceProjectMode;
  selectedProjectIds?: string[];
};

type WorkspaceRuleChannelState = {
  emailEnabled: boolean;
  ntfyEnabled: boolean;
  gotifyEnabled: boolean;
  webhookEnabled: boolean;
  feishuEnabled: boolean;
  larkEnabled: boolean;
  dingtalkEnabled: boolean;
};

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return value === null ? null : undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function maskValue(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "••••";
}

function normalizeSecretInput(
  inputValue: string | null | undefined,
  existingValue: string | null | undefined,
) {
  if (inputValue === undefined) {
    return normalizeOptionalString(existingValue ?? undefined);
  }

  return normalizeOptionalString(inputValue);
}

function isFeishuChannelConfigured(
  webhookUrl: string | null | undefined,
  atId: string | null | undefined,
  enabled: boolean | null | undefined,
  emailAddress: string | null,
): boolean {
  if (webhookUrl) return true;
  return (
    isFeishuAppConfigured("feishu") &&
    Boolean(atId || emailAddress) &&
    Boolean(enabled || atId)
  );
}

function isLarkChannelConfigured(
  webhookUrl: string | null | undefined,
  atId: string | null | undefined,
  enabled: boolean | null | undefined,
  emailAddress: string | null,
): boolean {
  if (webhookUrl) return true;
  return (
    isFeishuAppConfigured("lark") &&
    Boolean(atId || emailAddress) &&
    Boolean(enabled || atId)
  );
}

function isDingTalkChannelConfigured(
  webhookUrl: string | null | undefined,
  atId: string | null | undefined,
): boolean {
  if (webhookUrl) return true;
  return isDingTalkAppConfigured() && Boolean(atId);
}

async function assertWorkspaceMembership(userId: string, workspaceId: string) {
  const [membership] = await db
    .select({ workspaceId: workspaceUserTable.workspaceId })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new HTTPException(403, {
      message: "You don't have access to this workspace",
    });
  }
}

export async function validateProjectSelection(
  userId: string,
  workspaceId: string,
  selectedProjectIds: string[],
  hiddenProjectIds: string[] = [],
) {
  if (selectedProjectIds.length === 0 && hiddenProjectIds.length === 0) {
    throw new HTTPException(400, {
      message: "Select at least one project for selected project mode",
    });
  }

  const projects = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        inArray(projectTable.id, selectedProjectIds),
        projectAccessCondition(userId, projectTable.id),
      ),
    );

  if (projects.length !== new Set(selectedProjectIds).size) {
    throw new HTTPException(400, {
      message: "One or more selected projects are invalid",
    });
  }
}

export async function getNotificationPreferences(
  userId: string,
  emailAddress: string | null,
): Promise<NotificationPreferenceResponse> {
  const preference = await db.query.userNotificationPreferenceTable.findFirst({
    where: eq(userNotificationPreferenceTable.userId, userId),
  });

  const decryptedPreference = preference
    ? {
        ...preference,
        ntfyToken: decryptSecret(preference.ntfyToken),
        gotifyToken: decryptSecret(preference.gotifyToken),
        webhookSecret: decryptSecret(preference.webhookSecret),
        feishuSecret: decryptSecret(preference.feishuSecret),
        larkSecret: decryptSecret(preference.larkSecret),
        dingtalkSecret: decryptSecret(preference.dingtalkSecret),
      }
    : null;

  const rules = await db.query.userNotificationWorkspaceRuleTable.findMany({
    where: eq(userNotificationWorkspaceRuleTable.userId, userId),
    with: {
      workspace: true,
      selectedProjects: true,
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  const hiddenProjectIds = new Set(
    await findInaccessibleProjectIds(
      userId,
      rules.flatMap((rule) =>
        rule.selectedProjects.map((project) => project.projectId),
      ),
    ),
  );

  return {
    emailAddress,
    emailEnabled: decryptedPreference?.emailEnabled ?? false,
    ntfyEnabled: decryptedPreference?.ntfyEnabled ?? false,
    ntfyConfigured: Boolean(
      decryptedPreference?.ntfyServerUrl && decryptedPreference?.ntfyTopic,
    ),
    ntfyServerUrl: decryptedPreference?.ntfyServerUrl ?? null,
    ntfyTopic: decryptedPreference?.ntfyTopic ?? null,
    ntfyTokenConfigured: Boolean(decryptedPreference?.ntfyToken),
    maskedNtfyToken: maskValue(decryptedPreference?.ntfyToken),
    gotifyEnabled: decryptedPreference?.gotifyEnabled ?? false,
    gotifyConfigured: Boolean(
      decryptedPreference?.gotifyServerUrl && decryptedPreference?.gotifyToken,
    ),
    gotifyServerUrl: decryptedPreference?.gotifyServerUrl ?? null,
    gotifyTokenConfigured: Boolean(decryptedPreference?.gotifyToken),
    maskedGotifyToken: maskValue(decryptedPreference?.gotifyToken),
    webhookEnabled: decryptedPreference?.webhookEnabled ?? false,
    webhookConfigured: Boolean(decryptedPreference?.webhookUrl),
    webhookUrl: decryptedPreference?.webhookUrl ?? null,
    webhookSecretConfigured: Boolean(decryptedPreference?.webhookSecret),
    maskedWebhookSecret: maskValue(decryptedPreference?.webhookSecret),
    feishuEnabled: decryptedPreference?.feishuEnabled ?? false,
    feishuConfigured: isFeishuChannelConfigured(
      decryptedPreference?.feishuWebhookUrl,
      decryptedPreference?.feishuAtId,
      decryptedPreference?.feishuEnabled,
      emailAddress,
    ),
    feishuWebhookUrl: decryptedPreference?.feishuWebhookUrl ?? null,
    feishuSecretConfigured: Boolean(decryptedPreference?.feishuSecret),
    maskedFeishuSecret: maskValue(decryptedPreference?.feishuSecret),
    feishuAtId: decryptedPreference?.feishuAtId ?? null,
    larkEnabled: decryptedPreference?.larkEnabled ?? false,
    larkConfigured: isLarkChannelConfigured(
      decryptedPreference?.larkWebhookUrl,
      decryptedPreference?.larkAtId,
      decryptedPreference?.larkEnabled,
      emailAddress,
    ),
    larkWebhookUrl: decryptedPreference?.larkWebhookUrl ?? null,
    larkSecretConfigured: Boolean(decryptedPreference?.larkSecret),
    maskedLarkSecret: maskValue(decryptedPreference?.larkSecret),
    larkAtId: decryptedPreference?.larkAtId ?? null,
    dingtalkEnabled: decryptedPreference?.dingtalkEnabled ?? false,
    dingtalkConfigured: isDingTalkChannelConfigured(
      decryptedPreference?.dingtalkWebhookUrl,
      decryptedPreference?.dingtalkAtId,
    ),
    dingtalkWebhookUrl: decryptedPreference?.dingtalkWebhookUrl ?? null,
    dingtalkSecretConfigured: Boolean(decryptedPreference?.dingtalkSecret),
    maskedDingtalkSecret: maskValue(decryptedPreference?.dingtalkSecret),
    dingtalkAtId: decryptedPreference?.dingtalkAtId ?? null,
    taskAssignmentEnabled: preference?.taskAssignmentEnabled ?? true,
    taskCommentEnabled: preference?.taskCommentEnabled ?? true,
    taskStatusChangeEnabled: preference?.taskStatusChangeEnabled ?? true,
    dueDateReminderEnabled: preference?.dueDateReminderEnabled ?? true,
    dueDateReminderLeadTimeMinutes:
      preference?.dueDateReminderLeadTimeMinutes ?? 1440,
    workspaces: rules.map((rule) => ({
      id: rule.id,
      workspaceId: rule.workspaceId,
      workspaceName: rule.workspace.name,
      isActive: rule.isActive ?? true,
      emailEnabled: rule.emailEnabled ?? false,
      ntfyEnabled: rule.ntfyEnabled ?? false,
      gotifyEnabled: rule.gotifyEnabled ?? false,
      webhookEnabled: rule.webhookEnabled ?? false,
      feishuEnabled: rule.feishuEnabled ?? false,
      larkEnabled: rule.larkEnabled ?? false,
      dingtalkEnabled: rule.dingtalkEnabled ?? false,
      projectMode:
        rule.projectMode === "selected" ? "selected" : ("all" as const),
      selectedProjectIds: rule.selectedProjects
        .map((project) => project.projectId)
        .filter((projectId) => !hiddenProjectIds.has(projectId)),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    })),
    createdAt: preference?.createdAt ?? null,
    updatedAt: preference?.updatedAt ?? null,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  emailAddress: string | null,
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreferenceResponse> {
  const existing = await db.query.userNotificationPreferenceTable.findFirst({
    where: eq(userNotificationPreferenceTable.userId, userId),
  });

  const decryptedExisting = existing
    ? {
        ...existing,
        ntfyToken: decryptSecret(existing.ntfyToken),
        gotifyToken: decryptSecret(existing.gotifyToken),
        webhookSecret: decryptSecret(existing.webhookSecret),
        feishuSecret: decryptSecret(existing.feishuSecret),
        larkSecret: decryptSecret(existing.larkSecret),
        dingtalkSecret: decryptSecret(existing.dingtalkSecret),
      }
    : null;

  const ntfyServerUrl = normalizeOptionalString(
    input.ntfyServerUrl ?? decryptedExisting?.ntfyServerUrl,
  );
  const ntfyTopic = normalizeOptionalString(
    input.ntfyTopic ?? decryptedExisting?.ntfyTopic,
  );
  const ntfyToken = normalizeSecretInput(
    input.ntfyToken,
    decryptedExisting?.ntfyToken,
  );
  const gotifyServerUrl = normalizeOptionalString(
    input.gotifyServerUrl ?? decryptedExisting?.gotifyServerUrl,
  );
  const gotifyToken = normalizeSecretInput(
    input.gotifyToken,
    decryptedExisting?.gotifyToken,
  );
  const webhookUrl = normalizeOptionalString(
    input.webhookUrl ?? decryptedExisting?.webhookUrl,
  );
  const webhookSecret = normalizeSecretInput(
    input.webhookSecret,
    decryptedExisting?.webhookSecret,
  );
  const feishuWebhookUrl = normalizeSecretInput(
    input.feishuWebhookUrl,
    decryptedExisting?.feishuWebhookUrl,
  );
  const feishuSecret = normalizeSecretInput(
    input.feishuSecret,
    decryptedExisting?.feishuSecret,
  );
  const feishuAtId = normalizeSecretInput(
    input.feishuAtId,
    decryptedExisting?.feishuAtId,
  );
  const larkWebhookUrl = normalizeSecretInput(
    input.larkWebhookUrl,
    decryptedExisting?.larkWebhookUrl,
  );
  const larkSecret = normalizeSecretInput(
    input.larkSecret,
    decryptedExisting?.larkSecret,
  );
  const larkAtId = normalizeSecretInput(
    input.larkAtId,
    decryptedExisting?.larkAtId,
  );
  const dingtalkWebhookUrl = normalizeSecretInput(
    input.dingtalkWebhookUrl,
    decryptedExisting?.dingtalkWebhookUrl,
  );
  const dingtalkSecret = normalizeSecretInput(
    input.dingtalkSecret,
    decryptedExisting?.dingtalkSecret,
  );
  const dingtalkAtId = normalizeSecretInput(
    input.dingtalkAtId,
    decryptedExisting?.dingtalkAtId,
  );

  const emailEnabled =
    input.emailEnabled ?? decryptedExisting?.emailEnabled ?? false;
  const ntfyEnabled =
    input.ntfyEnabled ?? decryptedExisting?.ntfyEnabled ?? false;
  const gotifyEnabled =
    input.gotifyEnabled ?? decryptedExisting?.gotifyEnabled ?? false;
  const webhookEnabled =
    input.webhookEnabled ?? decryptedExisting?.webhookEnabled ?? false;
  const feishuEnabled =
    input.feishuEnabled ?? decryptedExisting?.feishuEnabled ?? false;
  const larkEnabled =
    input.larkEnabled ?? decryptedExisting?.larkEnabled ?? false;
  const dingtalkEnabled =
    input.dingtalkEnabled ?? decryptedExisting?.dingtalkEnabled ?? false;

  const enabledRuleCascade: WorkspaceRuleChannelState = {
    emailEnabled: false,
    ntfyEnabled: false,
    gotifyEnabled: false,
    webhookEnabled: false,
    feishuEnabled: false,
    larkEnabled: false,
    dingtalkEnabled: false,
  };

  const shouldValidateNtfy =
    ntfyEnabled ||
    input.ntfyServerUrl !== undefined ||
    input.ntfyTopic !== undefined ||
    input.ntfyToken !== undefined;

  const shouldValidateGotify =
    gotifyEnabled ||
    input.gotifyServerUrl !== undefined ||
    input.gotifyToken !== undefined;

  const shouldValidateWebhook =
    webhookEnabled ||
    input.webhookUrl !== undefined ||
    input.webhookSecret !== undefined;

  const shouldValidateFeishu = feishuEnabled || Boolean(feishuWebhookUrl);

  const shouldValidateLark = larkEnabled || Boolean(larkWebhookUrl);

  const shouldValidateDingtalk = dingtalkEnabled || Boolean(dingtalkWebhookUrl);

  if (emailEnabled && !emailAddress) {
    throw new HTTPException(400, {
      message: "Email notifications require an account email address",
    });
  }

  if (shouldValidateNtfy) {
    if (!ntfyServerUrl || !ntfyTopic) {
      throw new HTTPException(400, {
        message: "ntfy requires a server URL and topic",
      });
    }

    try {
      new URL(ntfyServerUrl);
      await assertPublicWebhookDestination(ntfyServerUrl);
    } catch (error) {
      throw new HTTPException(400, {
        message:
          error instanceof Error ? error.message : "Invalid ntfy server URL",
      });
    }
  }

  if (shouldValidateGotify) {
    if (!gotifyServerUrl || !gotifyToken) {
      throw new HTTPException(400, {
        message: "Gotify requires a server URL and app token",
      });
    }

    try {
      new URL(gotifyServerUrl);
      await assertPublicWebhookDestination(gotifyServerUrl);
    } catch (error) {
      throw new HTTPException(400, {
        message:
          error instanceof Error ? error.message : "Invalid Gotify server URL",
      });
    }
  }

  if (shouldValidateWebhook) {
    if (!webhookUrl) {
      throw new HTTPException(400, {
        message: "Webhook notifications require an endpoint URL",
      });
    }

    try {
      new URL(webhookUrl);
      await assertPublicWebhookDestination(webhookUrl);
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : "Invalid webhook URL",
      });
    }
  }

  if (shouldValidateFeishu) {
    if (feishuWebhookUrl) {
      if (!feishuWebhookUrlPattern.test(feishuWebhookUrl)) {
        throw new HTTPException(400, {
          message: "Invalid Feishu bot webhook URL",
        });
      }
      try {
        await assertPublicWebhookDestination(feishuWebhookUrl);
      } catch (error) {
        throw new HTTPException(400, {
          message:
            error instanceof Error
              ? error.message
              : "Invalid Feishu bot webhook URL",
        });
      }
    } else if (
      feishuEnabled &&
      !(isFeishuAppConfigured("feishu") && (feishuAtId || emailAddress))
    ) {
      throw new HTTPException(400, {
        message:
          "Feishu notifications require a bot webhook URL or a configured Feishu app",
      });
    }
  }

  if (shouldValidateLark) {
    if (larkWebhookUrl) {
      if (!larkWebhookUrlPattern.test(larkWebhookUrl)) {
        throw new HTTPException(400, {
          message: "Invalid Lark bot webhook URL",
        });
      }
      try {
        await assertPublicWebhookDestination(larkWebhookUrl);
      } catch (error) {
        throw new HTTPException(400, {
          message:
            error instanceof Error
              ? error.message
              : "Invalid Lark bot webhook URL",
        });
      }
    } else if (
      larkEnabled &&
      !(isFeishuAppConfigured("lark") && (larkAtId || emailAddress))
    ) {
      throw new HTTPException(400, {
        message:
          "Lark notifications require a bot webhook URL or a configured Lark app",
      });
    }
  }

  if (shouldValidateDingtalk) {
    if (dingtalkWebhookUrl) {
      if (!dingtalkWebhookUrlPattern.test(dingtalkWebhookUrl)) {
        throw new HTTPException(400, {
          message: "Invalid DingTalk bot webhook URL",
        });
      }
      try {
        await assertPublicWebhookDestination(dingtalkWebhookUrl);
      } catch (error) {
        throw new HTTPException(400, {
          message:
            error instanceof Error
              ? error.message
              : "Invalid DingTalk bot webhook URL",
        });
      }
    } else if (
      dingtalkEnabled &&
      !(isDingTalkAppConfigured() && dingtalkAtId)
    ) {
      throw new HTTPException(400, {
        message:
          "DingTalk notifications require a bot webhook URL or a configured DingTalk app with a target user ID or mobile",
      });
    }
  }

  const data = {
    userId,
    emailEnabled,
    ntfyEnabled,
    ntfyServerUrl,
    ntfyTopic,
    ntfyToken:
      input.ntfyToken === undefined
        ? (existing?.ntfyToken ?? null)
        : (encryptSecret(ntfyToken) ?? null),
    gotifyEnabled,
    gotifyServerUrl,
    gotifyToken:
      input.gotifyToken === undefined
        ? (existing?.gotifyToken ?? null)
        : (encryptSecret(gotifyToken) ?? null),
    webhookEnabled,
    webhookUrl,
    webhookSecret:
      input.webhookSecret === undefined
        ? (existing?.webhookSecret ?? null)
        : (encryptSecret(webhookSecret) ?? null),
    feishuEnabled,
    feishuWebhookUrl,
    feishuSecret:
      input.feishuSecret === undefined
        ? (existing?.feishuSecret ?? null)
        : (encryptSecret(feishuSecret) ?? null),
    feishuAtId,
    larkEnabled,
    larkWebhookUrl,
    larkSecret:
      input.larkSecret === undefined
        ? (existing?.larkSecret ?? null)
        : (encryptSecret(larkSecret) ?? null),
    larkAtId,
    dingtalkEnabled,
    dingtalkWebhookUrl,
    dingtalkSecret:
      input.dingtalkSecret === undefined
        ? (existing?.dingtalkSecret ?? null)
        : (encryptSecret(dingtalkSecret) ?? null),
    dingtalkAtId,
    taskAssignmentEnabled:
      input.taskAssignmentEnabled ?? existing?.taskAssignmentEnabled ?? true,
    taskCommentEnabled:
      input.taskCommentEnabled ?? existing?.taskCommentEnabled ?? true,
    taskStatusChangeEnabled:
      input.taskStatusChangeEnabled ??
      existing?.taskStatusChangeEnabled ??
      true,
    dueDateReminderEnabled:
      input.dueDateReminderEnabled ?? existing?.dueDateReminderEnabled ?? true,
    dueDateReminderLeadTimeMinutes:
      input.dueDateReminderLeadTimeMinutes ??
      existing?.dueDateReminderLeadTimeMinutes ??
      1440,
  };

  if (existing) {
    await db
      .update(userNotificationPreferenceTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferenceTable.userId, userId));
  } else {
    await db.insert(userNotificationPreferenceTable).values(data);
  }

  const ruleCascade: Partial<WorkspaceRuleChannelState> = {};

  const hadEmailEnabled = decryptedExisting?.emailEnabled ?? false;
  const hadNtfyEnabled = decryptedExisting?.ntfyEnabled ?? false;
  const hadGotifyEnabled = decryptedExisting?.gotifyEnabled ?? false;
  const hadWebhookEnabled = decryptedExisting?.webhookEnabled ?? false;
  const hadFeishuEnabled = decryptedExisting?.feishuEnabled ?? false;
  const hadLarkEnabled = decryptedExisting?.larkEnabled ?? false;
  const hadDingtalkEnabled = decryptedExisting?.dingtalkEnabled ?? false;

  const feishuReady = isFeishuChannelConfigured(
    feishuWebhookUrl,
    feishuAtId,
    feishuEnabled,
    emailAddress,
  );
  const larkReady = isLarkChannelConfigured(
    larkWebhookUrl,
    larkAtId,
    larkEnabled,
    emailAddress,
  );
  const dingtalkReady = isDingTalkChannelConfigured(
    dingtalkWebhookUrl,
    dingtalkAtId,
  );

  if (!emailEnabled) {
    ruleCascade.emailEnabled = false;
  }

  if (!ntfyEnabled || !ntfyServerUrl || !ntfyTopic) {
    ruleCascade.ntfyEnabled = false;
  }

  if (!gotifyEnabled || !gotifyServerUrl || !data.gotifyToken) {
    ruleCascade.gotifyEnabled = false;
  }

  if (!webhookEnabled || !webhookUrl) {
    ruleCascade.webhookEnabled = false;
  }

  if (!feishuEnabled || !feishuReady) {
    ruleCascade.feishuEnabled = false;
  }

  if (!larkEnabled || !larkReady) {
    ruleCascade.larkEnabled = false;
  }

  if (!dingtalkEnabled || !dingtalkReady) {
    ruleCascade.dingtalkEnabled = false;
  }

  if (emailEnabled && !hadEmailEnabled && emailAddress) {
    enabledRuleCascade.emailEnabled = true;
  }

  if (ntfyEnabled && !hadNtfyEnabled && ntfyServerUrl && ntfyTopic) {
    enabledRuleCascade.ntfyEnabled = true;
  }

  if (
    gotifyEnabled &&
    !hadGotifyEnabled &&
    gotifyServerUrl &&
    data.gotifyToken
  ) {
    enabledRuleCascade.gotifyEnabled = true;
  }

  if (webhookEnabled && !hadWebhookEnabled && webhookUrl) {
    enabledRuleCascade.webhookEnabled = true;
  }

  if (feishuEnabled && !hadFeishuEnabled && feishuReady) {
    enabledRuleCascade.feishuEnabled = true;
  }

  if (larkEnabled && !hadLarkEnabled && larkReady) {
    enabledRuleCascade.larkEnabled = true;
  }

  if (dingtalkEnabled && !hadDingtalkEnabled && dingtalkReady) {
    enabledRuleCascade.dingtalkEnabled = true;
  }

  const ruleEnableCascade = Object.fromEntries(
    Object.entries(enabledRuleCascade).filter(([, value]) => value),
  ) as Partial<WorkspaceRuleChannelState>;

  if (
    Object.keys(ruleCascade).length > 0 ||
    Object.keys(ruleEnableCascade).length > 0
  ) {
    await db
      .update(userNotificationWorkspaceRuleTable)
      .set({
        ...ruleEnableCascade,
        ...ruleCascade,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userNotificationWorkspaceRuleTable.userId, userId),
          eq(userNotificationWorkspaceRuleTable.isActive, true),
          or(
            eq(userNotificationWorkspaceRuleTable.emailEnabled, true),
            eq(userNotificationWorkspaceRuleTable.ntfyEnabled, true),
            eq(userNotificationWorkspaceRuleTable.gotifyEnabled, true),
            eq(userNotificationWorkspaceRuleTable.webhookEnabled, true),
            eq(userNotificationWorkspaceRuleTable.feishuEnabled, true),
            eq(userNotificationWorkspaceRuleTable.larkEnabled, true),
            eq(userNotificationWorkspaceRuleTable.dingtalkEnabled, true),
          ),
        ),
      );
  }

  return getNotificationPreferences(userId, emailAddress);
}

export async function upsertWorkspaceRule(
  userId: string,
  workspaceId: string,
  emailAddress: string | null,
  input: UpsertWorkspaceRuleInput,
): Promise<NotificationPreferenceResponse> {
  await assertWorkspaceMembership(userId, workspaceId);

  const hiddenProjectIds =
    input.projectMode === "selected"
      ? await findHiddenRuleProjectIds(userId, workspaceId)
      : [];
  const visibleProjectIds = (input.selectedProjectIds ?? []).filter(
    (projectId) => !hiddenProjectIds.includes(projectId),
  );
  if (input.projectMode === "selected") {
    await validateProjectSelection(
      userId,
      workspaceId,
      visibleProjectIds,
      hiddenProjectIds,
    );
  }

  const preference = await db.query.userNotificationPreferenceTable.findFirst({
    where: eq(userNotificationPreferenceTable.userId, userId),
  });

  if (input.emailEnabled && (!preference?.emailEnabled || !emailAddress)) {
    throw new HTTPException(400, {
      message: "Enable email notifications globally before using them here",
    });
  }

  if (
    input.ntfyEnabled &&
    (!preference?.ntfyEnabled ||
      !preference.ntfyServerUrl ||
      !preference.ntfyTopic)
  ) {
    throw new HTTPException(400, {
      message: "Enable ntfy notifications globally before using them here",
    });
  }

  if (
    input.webhookEnabled &&
    (!preference?.webhookEnabled || !preference.webhookUrl)
  ) {
    throw new HTTPException(400, {
      message: "Enable webhook notifications globally before using them here",
    });
  }

  if (
    input.gotifyEnabled &&
    (!preference?.gotifyEnabled ||
      !preference.gotifyServerUrl ||
      !preference.gotifyToken)
  ) {
    throw new HTTPException(400, {
      message: "Enable Gotify notifications globally before using them here",
    });
  }

  if (
    input.feishuEnabled &&
    (!preference?.feishuEnabled ||
      !isFeishuChannelConfigured(
        preference.feishuWebhookUrl,
        preference.feishuAtId,
        preference.feishuEnabled,
        emailAddress,
      ))
  ) {
    throw new HTTPException(400, {
      message: "Enable Feishu notifications globally before using them here",
    });
  }

  if (
    input.larkEnabled &&
    (!preference?.larkEnabled ||
      !isLarkChannelConfigured(
        preference.larkWebhookUrl,
        preference.larkAtId,
        preference.larkEnabled,
        emailAddress,
      ))
  ) {
    throw new HTTPException(400, {
      message: "Enable Lark notifications globally before using them here",
    });
  }

  if (
    input.dingtalkEnabled &&
    (!preference?.dingtalkEnabled ||
      !isDingTalkChannelConfigured(
        preference.dingtalkWebhookUrl,
        preference.dingtalkAtId,
      ))
  ) {
    throw new HTTPException(400, {
      message: "Enable DingTalk notifications globally before using them here",
    });
  }

  const existing = await db.query.userNotificationWorkspaceRuleTable.findFirst({
    where: and(
      eq(userNotificationWorkspaceRuleTable.userId, userId),
      eq(userNotificationWorkspaceRuleTable.workspaceId, workspaceId),
    ),
  });

  let ruleId = existing?.id;

  if (existing) {
    await db
      .update(userNotificationWorkspaceRuleTable)
      .set({
        isActive: input.isActive,
        emailEnabled: input.emailEnabled,
        ntfyEnabled: input.ntfyEnabled,
        gotifyEnabled: input.gotifyEnabled,
        webhookEnabled: input.webhookEnabled,
        feishuEnabled: input.feishuEnabled ?? false,
        larkEnabled: input.larkEnabled ?? false,
        dingtalkEnabled: input.dingtalkEnabled ?? false,
        projectMode: input.projectMode,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationWorkspaceRuleTable.id, existing.id));
  } else {
    const [createdRule] = await db
      .insert(userNotificationWorkspaceRuleTable)
      .values({
        userId,
        workspaceId,
        isActive: input.isActive,
        emailEnabled: input.emailEnabled,
        ntfyEnabled: input.ntfyEnabled,
        gotifyEnabled: input.gotifyEnabled,
        webhookEnabled: input.webhookEnabled,
        feishuEnabled: input.feishuEnabled ?? false,
        larkEnabled: input.larkEnabled ?? false,
        dingtalkEnabled: input.dingtalkEnabled ?? false,
        projectMode: input.projectMode,
      })
      .returning({ id: userNotificationWorkspaceRuleTable.id });
    ruleId = createdRule?.id;
  }

  if (!ruleId) {
    throw new HTTPException(500, {
      message: "Failed to save notification workspace rule",
    });
  }

  const workspaceRuleId = ruleId;

  await db
    .delete(userNotificationWorkspaceProjectTable)
    .where(
      eq(
        userNotificationWorkspaceProjectTable.workspaceRuleId,
        workspaceRuleId,
      ),
    );

  if (input.projectMode === "selected") {
    await db.insert(userNotificationWorkspaceProjectTable).values(
      [...new Set([...visibleProjectIds, ...hiddenProjectIds])].map(
        (projectId) => ({
          workspaceId,
          workspaceRuleId,
          projectId,
        }),
      ),
    );
  }

  return getNotificationPreferences(userId, emailAddress);
}

export async function deleteWorkspaceRule(
  userId: string,
  workspaceId: string,
  emailAddress: string | null,
): Promise<NotificationPreferenceResponse> {
  await assertWorkspaceMembership(userId, workspaceId);

  const existing = await db.query.userNotificationWorkspaceRuleTable.findFirst({
    where: and(
      eq(userNotificationWorkspaceRuleTable.userId, userId),
      eq(userNotificationWorkspaceRuleTable.workspaceId, workspaceId),
    ),
  });

  if (!existing) {
    throw new HTTPException(404, {
      message: "Workspace notification rule not found",
    });
  }

  await db
    .delete(userNotificationWorkspaceRuleTable)
    .where(eq(userNotificationWorkspaceRuleTable.id, existing.id));

  return getNotificationPreferences(userId, emailAddress);
}
