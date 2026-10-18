import { and, eq } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  taskTable,
  userNotificationPreferenceTable,
  userTable,
  workspaceTable,
} from "../../database/schema";
import type {
  PluginContext,
  TaskAssigneeChangedEvent,
  TaskCommentCreatedEvent,
  TaskCreatedEvent,
  TaskDescriptionChangedEvent,
  TaskDueDateChangedEvent,
  TaskPriorityChangedEvent,
  TaskStatusChangedEvent,
  TaskTitleChangedEvent,
} from "../types";
import {
  type FeishuConfig,
  type FeishuEventKey,
  normalizeFeishuLikeConfig,
} from "./config";
import {
  buildFeishuInteractiveCard,
  escapeFeishuMd,
  sendFeishuWebhook,
} from "./sender";

type FeishuPlatform = "feishu" | "lark";

type FeishuTaskEventData = {
  taskTitle: string;
  taskNumber: number | null;
  projectName: string;
  taskUrl: string | null;
  actorName: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  atId: string | null;
};

function isEnabled(config: FeishuConfig, key: FeishuEventKey): boolean {
  return config.events?.[key] ?? false;
}

function toSentenceCase(value: string | null): string {
  if (!value) return "Unknown";
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

async function resolveUserFeishuAtId(
  userId: string | null,
  platform: FeishuPlatform,
): Promise<string | null> {
  if (!userId) return null;

  const [pref] = await db
    .select({
      feishuAtId: userNotificationPreferenceTable.feishuAtId,
      larkAtId: userNotificationPreferenceTable.larkAtId,
    })
    .from(userNotificationPreferenceTable)
    .where(eq(userNotificationPreferenceTable.userId, userId))
    .limit(1);

  const configuredAtId =
    platform === "lark" ? pref?.larkAtId?.trim() : pref?.feishuAtId?.trim();
  if (configuredAtId) {
    return configuredAtId;
  }

  const [user] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return user?.email?.trim() || null;
}

async function getFeishuTaskEventData(
  taskId: string,
  projectId: string,
  actorUserId: string | null,
  platform: FeishuPlatform,
  explicitTargetUserId?: string | null,
): Promise<FeishuTaskEventData | null> {
  const [taskRow] = await db
    .select({
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      priority: taskTable.priority,
      assigneeId: taskTable.userId,
      projectName: projectTable.name,
      projectId: projectTable.id,
      workspaceId: workspaceTable.id,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .where(and(eq(taskTable.id, taskId), eq(projectTable.id, projectId)))
    .limit(1);

  if (!taskRow) {
    return null;
  }

  const [actor] = actorUserId
    ? await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, actorUserId))
        .limit(1)
    : [];

  const targetUserId =
    explicitTargetUserId !== undefined
      ? explicitTargetUserId
      : taskRow.assigneeId && taskRow.assigneeId !== actorUserId
        ? taskRow.assigneeId
        : null;

  const atId = await resolveUserFeishuAtId(targetUserId, platform);

  const clientUrl = process.env.KANEO_CLIENT_URL || "http://localhost:5173";
  const taskUrl = `${clientUrl}/dashboard/workspace/${taskRow.workspaceId}/project/${taskRow.projectId}/task/${taskId}`;

  return {
    taskTitle: taskRow.title,
    taskNumber: taskRow.number,
    projectName: taskRow.projectName,
    taskUrl,
    actorName: actor?.name ?? null,
    status: taskRow.status,
    priority: taskRow.priority,
    assigneeId: taskRow.assigneeId,
    atId,
  };
}

async function sendFeishuGroupMessage(
  config: FeishuConfig,
  title: string,
  body: string,
  data: FeishuTaskEventData,
): Promise<void> {
  const issueKey = data.taskNumber !== null ? `#${data.taskNumber}` : "Task";
  const taskLabel = data.taskUrl
    ? `[${escapeFeishuMd(issueKey)} ${escapeFeishuMd(data.taskTitle)}](${data.taskUrl})`
    : `${escapeFeishuMd(issueKey)} ${escapeFeishuMd(data.taskTitle)}`;

  const card = buildFeishuInteractiveCard({
    title,
    body,
    fields: [
      { label: "Task", value: taskLabel },
      { label: "Project", value: escapeFeishuMd(data.projectName) },
      { label: "Status", value: escapeFeishuMd(toSentenceCase(data.status)) },
      {
        label: "Priority",
        value: escapeFeishuMd(toSentenceCase(data.priority)),
      },
    ],
    actionUrl: data.taskUrl,
    actionLabel: "View task",
    footerText: data.actorName
      ? `Triggered by ${data.actorName}`
      : "Triggered by Kaneo",
    atId: data.atId,
  });

  await sendFeishuWebhook({
    webhookUrl: config.webhookUrl,
    secret: config.secret,
    card,
  });
}

export function createFeishuEventHandlers(platform: FeishuPlatform) {
  return {
    async handleTaskCreated(
      event: TaskCreatedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskCreated")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      await sendFeishuGroupMessage(
        config,
        "New task created",
        `A new task was added: **${escapeFeishuMd(event.title)}**`,
        data,
      );
    },

    async handleTaskStatusChanged(
      event: TaskStatusChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskStatusChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      await sendFeishuGroupMessage(
        config,
        "Task status changed",
        `**${escapeFeishuMd(event.title)}** moved from **${escapeFeishuMd(toSentenceCase(event.oldStatus))}** to **${escapeFeishuMd(toSentenceCase(event.newStatus))}**.`,
        data,
      );
    },

    async handleTaskPriorityChanged(
      event: TaskPriorityChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskPriorityChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      await sendFeishuGroupMessage(
        config,
        "Task priority changed",
        `**${escapeFeishuMd(event.title)}** changed from **${escapeFeishuMd(toSentenceCase(event.oldPriority))}** to **${escapeFeishuMd(toSentenceCase(event.newPriority))}**.`,
        data,
      );
    },

    async handleTaskTitleChanged(
      event: TaskTitleChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskTitleChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      await sendFeishuGroupMessage(
        config,
        "Task title changed",
        `Task renamed from **${escapeFeishuMd(truncate(event.oldTitle, 120))}** to **${escapeFeishuMd(truncate(event.newTitle, 120))}**.`,
        data,
      );
    },

    async handleTaskDescriptionChanged(
      event: TaskDescriptionChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskDescriptionChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      const summary = event.newDescription
        ? `: ${escapeFeishuMd(truncate(event.newDescription.replace(/\s+/g, " "), 160))}`
        : ".";
      await sendFeishuGroupMessage(
        config,
        "Task description changed",
        `The task description was updated${summary}`,
        data,
      );
    },

    async handleTaskCommentCreated(
      event: TaskCommentCreatedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskCommentCreated")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      await sendFeishuGroupMessage(
        config,
        "New task comment",
        escapeFeishuMd(truncate(event.comment.replace(/\s+/g, " "), 200)),
        data,
      );
    },

    async handleTaskAssigneeChanged(
      event: TaskAssigneeChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskAssigneeChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
        event.newAssigneeId,
      );
      if (!data) return;

      const assigneeLabel = event.newAssignee
        ? escapeFeishuMd(event.newAssignee)
        : "a team member";
      await sendFeishuGroupMessage(
        config,
        "Task assigned",
        `**${escapeFeishuMd(event.title)}** was assigned to **${assigneeLabel}**.`,
        data,
      );
    },

    async handleTaskDueDateChanged(
      event: TaskDueDateChangedEvent,
      context: PluginContext,
    ): Promise<void> {
      const config = normalizeFeishuLikeConfig(context.config as FeishuConfig);
      if (!isEnabled(config, "taskDueDateChanged")) return;

      const data = await getFeishuTaskEventData(
        event.taskId,
        event.projectId,
        event.userId,
        platform,
      );
      if (!data) return;

      const newDueStr = event.newDueDate
        ? new Date(event.newDueDate).toISOString().slice(0, 10)
        : "Cleared";
      await sendFeishuGroupMessage(
        config,
        "Task due date changed",
        `Due date for **${escapeFeishuMd(event.title)}** updated to **${newDueStr}**.`,
        data,
      );
    },
  };
}
