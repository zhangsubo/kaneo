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
  type LarkConfig,
  normalizeFeishuLikeConfig,
  validateLarkConfig,
} from "../plugins/feishu-shared/config";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { larkIntegrationSchema } from "./response";
import { createLarkBody, updateLarkBody } from "./schema";

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
    JSON.parse(integration.config) as LarkConfig,
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

async function getLarkIntegration(projectId: string) {
  const integration = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "lark"),
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

const getLarkIntegrationRoute = createRoute({
  method: "get",
  operationId: "getLarkIntegration",
  path: "/project/{projectId}",
  tags: ["Lark"],
  summary: "Get Lark integration",
  description:
    "Get the Lark integration for a project, or null when none is configured.",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse(
      "Lark integration details, or null",
      larkIntegrationSchema.nullable(),
    ),
    403: errorResponse("No access to the project"),
    404: errorResponse("Project not found"),
  },
});

const createLarkIntegrationRoute = createRoute({
  method: "post",
  operationId: "createLarkIntegration",
  path: "/project/{projectId}",
  tags: ["Lark"],
  summary: "Create Lark integration",
  description: "Create or replace the Lark bot integration for a project.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createLarkBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The stored integration",
      larkIntegrationSchema.nullable(),
    ),
    400: errorResponse("The webhook URL failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project not found"),
  },
});

const updateLarkIntegrationRoute = createRoute({
  method: "patch",
  operationId: "updateLarkIntegration",
  path: "/project/{projectId}",
  tags: ["Lark"],
  summary: "Update Lark integration",
  description:
    "Update the Lark integration. Omitted fields keep their current value, and null clears optional fields.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateLarkBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The updated integration",
      larkIntegrationSchema.nullable(),
    ),
    400: errorResponse("The resulting config failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Lark integration not found"),
  },
});

const deleteLarkIntegrationRoute = createRoute({
  method: "delete",
  operationId: "deleteLarkIntegration",
  path: "/project/{projectId}",
  tags: ["Lark"],
  summary: "Delete Lark integration",
  description: "Remove the Lark integration from a project.",
  middleware: manageAccess,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The integration was removed", deletedSchema),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Lark integration not found"),
  },
});

const larkIntegration = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getLarkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    return c.json(await getLarkIntegration(projectId), 200);
  })
  .openapi(createLarkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const config = normalizeFeishuLikeConfig({
      webhookUrl: body.webhookUrl,
      secret: body.secret,
      channelName: body.channelName,
      events: body.events,
    });

    const validation = await validateLarkConfig(config);
    if (!validation.valid) {
      throw new HTTPException(400, {
        message: validation.errors?.join(", ") ?? "Invalid config",
      });
    }

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "lark"),
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
        type: "lark",
        config: JSON.stringify(config),
        isActive: true,
      });
    }

    return c.json(await getLarkIntegration(projectId), 200);
  })
  .openapi(updateLarkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "lark"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "Lark integration not found",
      });
    }

    const currentConfig = normalizeFeishuLikeConfig(
      JSON.parse(existing.config) as LarkConfig,
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

    const validation = await validateLarkConfig(nextConfig);
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

    return c.json(await getLarkIntegration(projectId), 200);
  })
  .openapi(deleteLarkIntegrationRoute, async (c) => {
    const { projectId } = c.req.valid("param");

    const existing = await db.query.integrationTable.findFirst({
      where: and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "lark"),
      ),
    });

    if (!existing) {
      throw new HTTPException(404, {
        message: "Lark integration not found",
      });
    }

    await db
      .delete(integrationTable)
      .where(eq(integrationTable.id, existing.id));

    return c.json({ success: true }, 200);
  });

export default larkIntegration;
