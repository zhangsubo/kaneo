import { dingtalkPlugin } from "./dingtalk";
import { discordPlugin } from "./discord";
import { feishuPlugin } from "./feishu";
import { genericWebhookPlugin } from "./generic-webhook";
import { giteaPlugin } from "./gitea";
import { githubPlugin, initializeGitHubPlugin } from "./github";
import { gitlabPlugin } from "./gitlab";
import { larkPlugin } from "./lark";
import { mattermostPlugin } from "./mattermost";
import { initializeEventSubscriptions, registerPlugin } from "./registry";
import { slackPlugin } from "./slack";
import { telegramPlugin } from "./telegram";

export function initializePlugins() {
  console.log("Initializing plugins...");

  registerPlugin(githubPlugin);
  registerPlugin(giteaPlugin);
  registerPlugin(gitlabPlugin);
  registerPlugin(slackPlugin);
  registerPlugin(mattermostPlugin);
  registerPlugin(discordPlugin);
  registerPlugin(genericWebhookPlugin);
  registerPlugin(telegramPlugin);
  registerPlugin(feishuPlugin);
  registerPlugin(larkPlugin);
  registerPlugin(dingtalkPlugin);
  initializeGitHubPlugin();
  initializeEventSubscriptions();

  console.log("✅ Plugins initialized");
}

export * from "./registry";
export * from "./types";
