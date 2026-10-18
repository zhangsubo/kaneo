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
  type DingTalkConfig,
  type DingTalkEventKey,
  normalizeDingTalkConfig,
} from "./config";
import { buildDingTalkMarkdownPayload, sendDingTalkWebhook } from "./sender";

type DingTalkTaskEventData = {
  taskTitle: string;
  taskNumber: number | null;
  projectName: string;
  taskUrl: string | null;
  actorName: string | null;
  status: string | null;
  priority: string | null;
  atId: string | null;
};

function isEnabled(config: DingTalkConfig, key: DingTalkEventKey): boolean {
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

async function resolveUserDingTalkAtId(
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;

  const [pref] = await db
    .select({
      dingtalkAtId: userNotificationPreferenceTable.dingtalkAtId,
    })
    .from(userNotificationPreferenceTable)
    .where(eq(userNotificationPreferenceTable.userId, userId))
    .limit(1);

  return pref?.dingtalkAtId?.trim() || null;
}

async function getDingTalkTaskEventData(
  taskId: string,
  projectId: string,
  actorUserId: string | null,
  explicitTargetUserId?: string | null,
): Promise<DingTalkTaskEventData | null> {
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

  const atId = await resolveUserDingTalkAtId(targetUserId);

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
    atId,
  };
}

async function sendDingTalkGroupMessage(
  config: DingTalkConfig,
  title: string,
  body: string,
  data: DingTalkTaskEventData,
): Promise<void> {
  const issueKey = data.taskNumber !== null ? `#${data.taskNumber}` : "Task";
  const taskLabel = data.taskUrl
    ? `[${issueKey} ${data.taskTitle}](${data.taskUrl})`
    : `${issueKey} ${data.taskTitle}`;

  const payload = buildDingTalkMarkdownPayload({
    title,
    body,
    fields: [
      { label: "Task", value: taskLabel },
      { label: "Project", value: data.projectName },
      { label: "Status", value: toSentenceCase(data.status) },
      { label: "Priority", value: toSentenceCase(data.priority) },
    ],
    actionUrl: data.taskUrl,
    actionLabel: "View task",
    footerText: data.actorName
      ? `Triggered by ${data.actorName}`
      : "Triggered by Kaneo",
    atId: data.atId,
  });

  await sendDingTalkWebhook({
    webhookUrl: config.webhookUrl,
    secret: config.secret,
    payload,
  });
}

export async function handleTaskCreated(
  event: TaskCreatedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskCreated")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  await sendDingTalkGroupMessage(
    config,
    "New task created",
    `A new task was added: **${event.title}**`,
    data,
  );
}

export async function handleTaskStatusChanged(
  event: TaskStatusChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskStatusChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  await sendDingTalkGroupMessage(
    config,
    "Task status changed",
    `**${event.title}** moved from **${toSentenceCase(event.oldStatus)}** to **${toSentenceCase(event.newStatus)}**.`,
    data,
  );
}

export async function handleTaskPriorityChanged(
  event: TaskPriorityChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskPriorityChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  await sendDingTalkGroupMessage(
    config,
    "Task priority changed",
    `**${event.title}** changed from **${toSentenceCase(event.oldPriority)}** to **${toSentenceCase(event.newPriority)}**.`,
    data,
  );
}

export async function handleTaskTitleChanged(
  event: TaskTitleChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskTitleChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  await sendDingTalkGroupMessage(
    config,
    "Task title changed",
    `Task renamed from **${truncate(event.oldTitle, 120)}** to **${truncate(event.newTitle, 120)}**.`,
    data,
  );
}

export async function handleTaskDescriptionChanged(
  event: TaskDescriptionChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskDescriptionChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  const summary = event.newDescription
    ? `: ${truncate(event.newDescription.replace(/\s+/g, " "), 160)}`
    : ".";
  await sendDingTalkGroupMessage(
    config,
    "Task description changed",
    `The task description was updated${summary}`,
    data,
  );
}

export async function handleTaskCommentCreated(
  event: TaskCommentCreatedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskCommentCreated")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  await sendDingTalkGroupMessage(
    config,
    "New task comment",
    truncate(event.comment.replace(/\s+/g, " "), 200),
    data,
  );
}

export async function handleTaskAssigneeChanged(
  event: TaskAssigneeChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskAssigneeChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
    event.newAssigneeId,
  );
  if (!data) return;

  const assigneeLabel = event.newAssignee || "a team member";
  await sendDingTalkGroupMessage(
    config,
    "Task assigned",
    `**${event.title}** was assigned to **${assigneeLabel}**.`,
    data,
  );
}

export async function handleTaskDueDateChanged(
  event: TaskDueDateChangedEvent,
  context: PluginContext,
): Promise<void> {
  const config = normalizeDingTalkConfig(context.config as DingTalkConfig);
  if (!isEnabled(config, "taskDueDateChanged")) return;

  const data = await getDingTalkTaskEventData(
    event.taskId,
    event.projectId,
    event.userId,
  );
  if (!data) return;

  const newDueStr = event.newDueDate
    ? new Date(event.newDueDate).toISOString().slice(0, 10)
    : "Cleared";
  await sendDingTalkGroupMessage(
    config,
    "Task due date changed",
    `Due date for **${event.title}** updated to **${newDueStr}**.`,
    data,
  );
}
