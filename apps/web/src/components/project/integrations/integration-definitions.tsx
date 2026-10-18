import { Webhook } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { DingtalkIcon } from "@/components/icons/dingtalk-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { FeishuIcon } from "@/components/icons/feishu-icon";
import { GiteaIcon } from "@/components/icons/gitea-icon";
import { GithubIcon } from "@/components/icons/github-icon";
import { GitlabIcon } from "@/components/icons/gitlab-icon";
import { LarkIcon } from "@/components/icons/lark-icon";
import { MattermostIcon } from "@/components/icons/mattermost-icon";
import { SlackIcon } from "@/components/icons/slack-icon";
import { TelegramIcon } from "@/components/icons/telegram-icon";
import { DingtalkIntegrationSettings } from "@/components/project/dingtalk-integration-settings";
import { DiscordIntegrationSettings } from "@/components/project/discord-integration-settings";
import { FeishuIntegrationSettings } from "@/components/project/feishu-integration-settings";
import { GenericWebhookIntegrationSettings } from "@/components/project/generic-webhook-integration-settings";
import { GiteaIntegrationSettings } from "@/components/project/gitea-integration/gitea-integration-settings";
import { GitHubIntegrationSettings } from "@/components/project/github-integration/github-integration-settings";
import { GitlabIntegrationSettings } from "@/components/project/gitlab-integration/gitlab-integration-settings";
import { LarkIntegrationSettings } from "@/components/project/lark-integration-settings";
import { MattermostIntegrationSettings } from "@/components/project/mattermost-integration-settings";
import { SlackIntegrationSettings } from "@/components/project/slack-integration-settings";
import { TelegramIntegrationSettings } from "@/components/project/telegram-integration-settings";

export type IntegrationId =
  | "github"
  | "gitea"
  | "gitlab"
  | "slack"
  | "discord"
  | "mattermost"
  | "feishu"
  | "lark"
  | "dingtalk"
  | "telegram"
  | "webhook";

export type IntegrationDefinition = {
  id: IntegrationId;
  category: "code" | "chat";
  name: string | { key: string };
  descriptionKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName: string;
  Settings: ComponentType<{ projectId: string }>;
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "github",
    category: "code",
    name: "GitHub",
    descriptionKey: "settings:projectIntegrations.githubSectionSubtitle",
    icon: GithubIcon,
    iconClassName: "text-foreground",
    Settings: GitHubIntegrationSettings,
  },
  {
    id: "gitea",
    category: "code",
    name: "Gitea",
    descriptionKey: "settings:projectIntegrations.giteaSectionSubtitle",
    icon: GiteaIcon,
    iconClassName: "text-[#609926]",
    Settings: GiteaIntegrationSettings,
  },
  {
    id: "gitlab",
    category: "code",
    name: "GitLab",
    descriptionKey: "settings:projectIntegrations.gitlabSectionSubtitle",
    icon: GitlabIcon,
    iconClassName: "text-[#FC6D26]",
    Settings: GitlabIntegrationSettings,
  },
  {
    id: "slack",
    category: "chat",
    name: "Slack",
    descriptionKey: "settings:projectIntegrations.slackSectionSubtitle",
    icon: SlackIcon,
    iconClassName: "",
    Settings: SlackIntegrationSettings,
  },
  {
    id: "discord",
    category: "chat",
    name: "Discord",
    descriptionKey: "settings:projectIntegrations.discordSectionSubtitle",
    icon: DiscordIcon,
    iconClassName: "text-[#5865F2]",
    Settings: DiscordIntegrationSettings,
  },
  {
    id: "mattermost",
    category: "chat",
    name: "Mattermost",
    descriptionKey: "settings:projectIntegrations.mattermostSectionSubtitle",
    icon: MattermostIcon,
    iconClassName: "text-[#0058CC] dark:text-[#5C9DFF]",
    Settings: MattermostIntegrationSettings,
  },
  {
    id: "feishu",
    category: "chat",
    name: { key: "settings:projectIntegrations.feishuSectionTitle" },
    descriptionKey: "settings:projectIntegrations.feishuSectionSubtitle",
    icon: FeishuIcon,
    iconClassName: "text-[#3370FF]",
    Settings: FeishuIntegrationSettings,
  },
  {
    id: "lark",
    category: "chat",
    name: { key: "settings:projectIntegrations.larkSectionTitle" },
    descriptionKey: "settings:projectIntegrations.larkSectionSubtitle",
    icon: LarkIcon,
    iconClassName: "text-[#00D6B9]",
    Settings: LarkIntegrationSettings,
  },
  {
    id: "dingtalk",
    category: "chat",
    name: { key: "settings:projectIntegrations.dingtalkSectionTitle" },
    descriptionKey: "settings:projectIntegrations.dingtalkSectionSubtitle",
    icon: DingtalkIcon,
    iconClassName: "text-[#0089FF]",
    Settings: DingtalkIntegrationSettings,
  },
  {
    id: "telegram",
    category: "chat",
    name: "Telegram",
    descriptionKey: "settings:projectIntegrations.telegramSectionSubtitle",
    icon: TelegramIcon,
    iconClassName: "text-[#26A5E4]",
    Settings: TelegramIntegrationSettings,
  },
  {
    id: "webhook",
    category: "chat",
    name: { key: "settings:projectIntegrations.genericWebhookSectionTitle" },
    descriptionKey:
      "settings:projectIntegrations.genericWebhookSectionSubtitle",
    icon: Webhook,
    iconClassName: "text-muted-foreground",
    Settings: GenericWebhookIntegrationSettings,
  },
];
