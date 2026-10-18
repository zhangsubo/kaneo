import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { integrationTable } from "../database/schema";
import { deletedSchema, projectIdParam } from "../integrations/schema";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import {
  defaultDingTalkEvents,
  type DingTalkConfig,
  normalizeDingTalkConfig,
  validateDingTalkConfig,
} from "../plugins/dingtalk/config";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { dingtalkIntegrationSchema } from "./response";
import { createDingtalkBody, updateDingtalkBody } from "./schema";

function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    const token = url.searchParams.get("access_token") ?? "";
    const maskedToken =
      token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : "••••";
    return `${url.origin}${url.pathname}?access_token=${maskedToken}`;
  } catch {
    return "Configured";
  }
}

function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "••••";
}

function toResponse(integration: {
  id: string;
  projectId: string;
  config: string;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const config = normalizeDingTalkConfig(
    JSON.parse(integration.config) as DingTalkConfig,
  );

  return {
    id: integration.id,
    projectId: integration.projectId,
    channelName: config.channelName ?? null,
    webhookConfigured: Boolean(config.webhookUrl),
    maskedWebhookUrl: maskWebhookUrl(config.webhookUrl),
    secretConfigured: Boolean(config.secret),
    maskedSecret: maskSecret(config.secret),
    events: {
      ...defaultDingTalkEvents,
      ...config.events,
    },
    isActive: integration.isActive,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

async function getDingtalkIntegration(projectId: string) {
  const integration = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "dingtalk"),
    ),
  });

  if (!integration) {
    return null;
  }

  return toResponse(integration);
}

const manageAccess = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ workspace: ["manage_settings"] }),
];

const getDingtalkIntegrationRoute = createRoute({
  method: "get",
  operationId: "getDingtalkIntegration",
  path: "/project/{projectId}",
  tags: ["DingTalk"],
  summary: "Get DingTalk integration",
  description:
    "Get the DingTalk integration for a project, or null when none is configured.",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse(
      "DingTalk integration details, or null",
      dingtalkIntegrationSchema.nullable(),
    ),
    403: errorResponse("No access to the project"),
    404: errorResponse("Project not found"),
  },
});

const createDingtalkIntegrationRoute = createRoute({
  method: "post",
  operationId: "createDingtalkIntegration",
  path: "/project/{projectId}",
  tags: ["DingTalk"],
  summary: "Create DingTalk integration",
  description: "Create or replace the DingTalk bot integration for a project.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createDingtalkBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The stored integration",
      dingtalkIntegrationSchema.nullable(),
    ),
    400: errorResponse("The webhook URL failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project not found"),
  },
});

const updateDingtalkIntegrationRoute = createRoute({
  method: "patch",
  operationId: "updateDingtalkIntegration",
  path: "/project/{projectId}",
  tags: ["DingTalk"],
  summary: "Update DingTalk integration",
  description:
    "Update the DingTalk integration. Omitted fields keep their current value, and null clears optional fields.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateDingtalkBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The updated integration",
      dingtalkIntegrationSchema.nullable(),
    ),
    400: errorResponse("The resulting config failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or DingTalk integration not found"),
  },
});

const deleteDingtalkIntegrationRoute = createRoute({
  method: "delete",
  operationId: "deleteDingtalkIntegration",
  path: "/project/{projectId}",
  tags: ["DingTalk"],
  summary: "Delete DingTalk integration",
  description: "Remove the DingTalk integration from a project.",
  middleware: manageAccess,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The integration was removed", deletedSchema),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or DingTalk integration not found"),
  },
});

const dingtalkIntegration = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getDingtalkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    return c.json(await getDingtalkIntegration(projectId), 200);
  })
  .openapi(createDingtalkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const config = normalizeDingTalkConfig({
      webhookUrl: body.webhookUrl,
      secret: body.secret,
      channelName: body.channelName,
      events: body.events,
    });

    const validation = await validateDingTalkConfig(config);
    if (!validation.valid) {
      throw new HTTPException(400, {
        message: validation.errors?.join(", ") ?? "Invalid config",
      });
    }

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "dingtalk"),
      ),
    });

    if (existing) {
      await db
        .update(integrationTable)
        .set({
          config: JSON.stringify(config),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(integrationTable.id, existing.id));
    } else {
      await db.insert(integrationTable).values({
        projectId,
        type: "dingtalk",
        config: JSON.stringify(config),
        isActive: true,
      });
    }

    return c.json(await getDingtalkIntegration(projectId), 200);
  })
  .openapi(updateDingtalkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "dingtalk"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "DingTalk integration not found",
      });
    }

    const currentConfig = normalizeDingTalkConfig(
      JSON.parse(existing.config) as DingTalkConfig,
    );
    const nextConfig = normalizeDingTalkConfig({
      webhookUrl: body.webhookUrl?.trim() || currentConfig.webhookUrl,
      secret:
        body.secret === undefined
          ? currentConfig.secret
          : (body.secret ?? undefined),
      channelName:
        body.channelName === undefined
          ? currentConfig.channelName
          : (body.channelName ?? undefined),
      events: {
        ...currentConfig.events,
        ...body.events,
      },
    });

    const validation = await validateDingTalkConfig(nextConfig);
    if (!validation.valid) {
      throw new HTTPException(400, {
        message: validation.errors?.join(", ") ?? "Invalid config",
      });
    }

    await db
      .update(integrationTable)
      .set({
        config: JSON.stringify(nextConfig),
        isActive:
          body.isActive !== undefined
            ? body.isActive
            : (existing.isActive ?? true),
        updatedAt: new Date(),
      })
      .where(eq(integrationTable.id, existing.id));

    return c.json(await getDingtalkIntegration(projectId), 200);
  })
  .openapi(deleteDingtalkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "dingtalk"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "DingTalk integration not found",
      });
    }

    await db
      .delete(integrationTable)
      .where(eq(integrationTable.id, existing.id));

    return c.json({ success: true }, 200);
  });

export default dingtalkIntegration;
