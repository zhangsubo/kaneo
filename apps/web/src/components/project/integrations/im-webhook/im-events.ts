import type { EventChecklistItem } from "@/components/project/integrations/event-checklist/event-checklist-item";
import type { ImIntegrationEvents } from "@/fetchers/im-integration/im-integration-client";

export const IM_EVENT_ITEMS: EventChecklistItem<keyof ImIntegrationEvents>[] = [
  {
    id: "taskCreated",
    labelKey: "settings:chatIntegrations.events.taskCreated",
  },
  {
    id: "taskStatusChanged",
    labelKey: "settings:chatIntegrations.events.taskStatusChanged",
  },
  {
    id: "taskAssigneeChanged",
    labelKey: "settings:genericWebhookIntegration.events.taskAssigneeChanged",
  },
  {
    id: "taskCommentCreated",
    labelKey: "settings:chatIntegrations.events.taskCommentCreated",
  },
  {
    id: "taskPriorityChanged",
    labelKey: "settings:chatIntegrations.events.taskPriorityChanged",
  },
  {
    id: "taskDueDateChanged",
    labelKey: "settings:genericWebhookIntegration.events.taskDueDateChanged",
  },
  {
    id: "taskTitleChanged",
    labelKey: "settings:chatIntegrations.events.taskTitleChanged",
  },
  {
    id: "taskDescriptionChanged",
    labelKey: "settings:chatIntegrations.events.taskDescriptionChanged",
  },
];

export function toImEvents(
  events?: Partial<ImIntegrationEvents> | null,
): ImIntegrationEvents {
  return {
    taskCreated: events?.taskCreated ?? true,
    taskStatusChanged: events?.taskStatusChanged ?? true,
    taskPriorityChanged: events?.taskPriorityChanged ?? false,
    taskTitleChanged: events?.taskTitleChanged ?? false,
    taskDescriptionChanged: events?.taskDescriptionChanged ?? false,
    taskCommentCreated: events?.taskCommentCreated ?? true,
    taskAssigneeChanged: events?.taskAssigneeChanged ?? true,
    taskDueDateChanged: events?.taskDueDateChanged ?? false,
  };
}
