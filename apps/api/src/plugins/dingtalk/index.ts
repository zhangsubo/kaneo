import type { IntegrationPlugin } from "../types";
import { validateDingTalkConfig } from "./config";
import {
  handleTaskAssigneeChanged,
  handleTaskCommentCreated,
  handleTaskCreated,
  handleTaskDescriptionChanged,
  handleTaskDueDateChanged,
  handleTaskPriorityChanged,
  handleTaskStatusChanged,
  handleTaskTitleChanged,
} from "./events";

export const dingtalkPlugin: IntegrationPlugin = {
  type: "dingtalk",
  name: "DingTalk",
  onTaskCreated: handleTaskCreated,
  onTaskStatusChanged: handleTaskStatusChanged,
  onTaskPriorityChanged: handleTaskPriorityChanged,
  onTaskTitleChanged: handleTaskTitleChanged,
  onTaskDescriptionChanged: handleTaskDescriptionChanged,
  onTaskCommentCreated: handleTaskCommentCreated,
  onTaskAssigneeChanged: handleTaskAssigneeChanged,
  onTaskDueDateChanged: handleTaskDueDateChanged,
  validateConfig: validateDingTalkConfig,
};
