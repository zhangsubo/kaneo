import type { IntegrationPlugin } from "../types";
import { validateFeishuConfig } from "../feishu-shared/config";
import { createFeishuEventHandlers } from "../feishu-shared/events";

const handlers = createFeishuEventHandlers("feishu");

export const feishuPlugin: IntegrationPlugin = {
  type: "feishu",
  name: "Feishu",
  onTaskCreated: handlers.handleTaskCreated,
  onTaskStatusChanged: handlers.handleTaskStatusChanged,
  onTaskPriorityChanged: handlers.handleTaskPriorityChanged,
  onTaskTitleChanged: handlers.handleTaskTitleChanged,
  onTaskDescriptionChanged: handlers.handleTaskDescriptionChanged,
  onTaskCommentCreated: handlers.handleTaskCommentCreated,
  onTaskAssigneeChanged: handlers.handleTaskAssigneeChanged,
  onTaskDueDateChanged: handlers.handleTaskDueDateChanged,
  validateConfig: validateFeishuConfig,
};
