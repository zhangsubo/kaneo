import type { IntegrationPlugin } from "../types";
import { validateLarkConfig } from "../feishu-shared/config";
import { createFeishuEventHandlers } from "../feishu-shared/events";

const handlers = createFeishuEventHandlers("lark");

export const larkPlugin: IntegrationPlugin = {
  type: "lark",
  name: "Lark",
  onTaskCreated: handlers.handleTaskCreated,
  onTaskStatusChanged: handlers.handleTaskStatusChanged,
  onTaskPriorityChanged: handlers.handleTaskPriorityChanged,
  onTaskTitleChanged: handlers.handleTaskTitleChanged,
  onTaskDescriptionChanged: handlers.handleTaskDescriptionChanged,
  onTaskCommentCreated: handlers.handleTaskCommentCreated,
  onTaskAssigneeChanged: handlers.handleTaskAssigneeChanged,
  onTaskDueDateChanged: handlers.handleTaskDueDateChanged,
  validateConfig: validateLarkConfig,
};
