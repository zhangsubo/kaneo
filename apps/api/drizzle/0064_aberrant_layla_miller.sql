ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "feishu_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "feishu_webhook_url" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "feishu_secret" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "feishu_at_id" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "lark_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "lark_webhook_url" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "lark_secret" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "lark_at_id" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "dingtalk_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "dingtalk_webhook_url" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "dingtalk_secret" text;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN IF NOT EXISTS "dingtalk_at_id" text;--> statement-breakpoint
ALTER TABLE "user_notification_workspace_rule" ADD COLUMN IF NOT EXISTS "feishu_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_workspace_rule" ADD COLUMN IF NOT EXISTS "lark_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_workspace_rule" ADD COLUMN IF NOT EXISTS "dingtalk_enabled" boolean DEFAULT false NOT NULL;