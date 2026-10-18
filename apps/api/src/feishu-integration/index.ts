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
  defaultFeishuEvents,
  type FeishuConfig,
  normalizeFeishuLikeConfig,
  validateFeishuConfig,
} from "../plugins/feishu-shared/config";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { feishuIntegrationSchema } from "./response";
import { createFeishuBody, updateFeishuBody } from "./schema";

function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const maskedLast =
      last.length > 8 ? `${last.slice(0, 4)}…${last.slice(-4)}` : "••••";
    return `${url.origin}/${parts.slice(0, -1).join("/")}/${maskedLast}`;
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
  const config = normalizeFeishuLikeConfig(
    JSON.parse(integration.config) as FeishuConfig,
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
      ...defaultFeishuEvents,
      ...config.events,
    },
    isActive: integration.isActive,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

async function getFeishuIntegration(projectId: string) {
  const integration = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "feishu"),
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

const getFeishuIntegrationRoute = createRoute({
  method: "get",
  operationId: "getFeishuIntegration",
  path: "/project/{projectId}",
  tags: ["Feishu"],
  summary: "Get Feishu integration",
  description:
    "Get the Feishu integration for a project, or null when none is configured.",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse(
      "Feishu integration details, or null",
      feishuIntegrationSchema.nullable(),
    ),
    403: errorResponse("No access to the project"),
    404: errorResponse("Project not found"),
  },
});

const createFeishuIntegrationRoute = createRoute({
  method: "post",
  operationId: "createFeishuIntegration",
  path: "/project/{projectId}",
  tags: ["Feishu"],
  summary: "Create Feishu integration",
  description: "Create or replace the Feishu bot integration for a project.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createFeishuBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The stored integration",
      feishuIntegrationSchema.nullable(),
    ),
    400: errorResponse("The webhook URL failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project not found"),
  },
});

const updateFeishuIntegrationRoute = createRoute({
  method: "patch",
  operationId: "updateFeishuIntegration",
  path: "/project/{projectId}",
  tags: ["Feishu"],
  summary: "Update Feishu integration",
  description:
    "Update the Feishu integration. Omitted fields keep their current value, and null clears optional fields.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateFeishuBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The updated integration",
      feishuIntegrationSchema.nullable(),
    ),
    400: errorResponse("The resulting config failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Feishu integration not found"),
  },
});

const deleteFeishuIntegrationRoute = createRoute({
  method: "delete",
  operationId: "deleteFeishuIntegration",
  path: "/project/{projectId}",
  tags: ["Feishu"],
  summary: "Delete Feishu integration",
  description: "Remove the Feishu integration from a project.",
  middleware: manageAccess,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The integration was removed", deletedSchema),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Feishu integration not found"),
  },
});

const feishuIntegration = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getFeishuIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    return c.json(await getFeishuIntegration(projectId), 200);
  })
  .openapi(createFeishuIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const config = normalizeFeishuLikeConfig({
      webhookUrl: body.webhookUrl,
      secret: body.secret,
      channelName: body.channelName,
      events: body.events,
    });

    const validation = await validateFeishuConfig(config);
    if (!validation.valid) {
      throw new HTTPException(400, {
        message: validation.errors?.join(", ") ?? "Invalid config",
      });
    }

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "feishu"),
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
        type: "feishu",
        config: JSON.stringify(config),
        isActive: true,
      });
    }

    return c.json(await getFeishuIntegration(projectId), 200);
  })
  .openapi(updateFeishuIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "feishu"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "Feishu integration not found",
      });
    }

    const currentConfig = normalizeFeishuLikeConfig(
      JSON.parse(existing.config) as FeishuConfig,
    );
    const nextConfig = normalizeFeishuLikeConfig({
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

    const validation = await validateFeishuConfig(nextConfig);
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

    return c.json(await getFeishuIntegration(projectId), 200);
  })
  .openapi(deleteFeishuIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "feishu"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "Feishu integration not found",
      });
    }

    await db
      .delete(integrationTable)
      .where(eq(integrationTable.id, existing.id));

    return c.json({ success: true }, 200);
  });

export default feishuIntegration;
