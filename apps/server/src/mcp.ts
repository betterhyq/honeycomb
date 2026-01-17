import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sseHandlers } from 'express-mcp-handler';
import express from 'express';
import consola from 'consola';
import { z } from 'zod';
import { getDatabaseClient } from '@jd-wmfe/honeycomb-database';
import type { Selectable } from 'kysely';
import type { ConfigsTable, ToolsTable } from '@jd-wmfe/honeycomb-database';
import { StatusEnum } from '@jd-wmfe/honeycomb-type';

// ==================== 类型定义 ====================
export type McpHandlers = ReturnType<typeof sseHandlers>;

// ==================== JSON Schema 转换 ====================

/**
 * 将 JSON Schema 转换为 Zod schema
 * 支持标准的 JSON Schema 格式，例如: {"message": {"type": "string", "description": "..."}}
 */
function jsonSchemaToZod(schemaObj: Record<string, any>): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, value] of Object.entries(schemaObj)) {
    if (typeof value === 'object' && value !== null) {
      const fieldSchema = value as { type?: string; description?: string };
      let zodType: z.ZodTypeAny;

      // 根据 JSON Schema 的 type 创建对应的 Zod 类型
      switch (fieldSchema.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'integer':
          zodType = z.number().int();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        case 'object':
          zodType = z.object({});
          break;
        default:
          zodType = z.any();
      }

      // 如果有 description，添加描述
      if (fieldSchema.description) {
        zodType = zodType.describe(fieldSchema.description);
      }

      shape[key] = zodType;
    } else {
      shape[key] = z.any();
    }
  }

  return z.object(shape);
}

// ==================== MCP 服务管理 ====================

/**
 * 创建 MCP 服务器工厂函数
 */
function createMcpServerFactory(config: Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }) {
  return () => {
    const server = new McpServer({
      name: config.name,
      version: config.version,
      description: config.description,
    });

    // 批量注册工具
    config.tools.forEach((tool) => {
      try {
        // 解析 JSON Schema（标准 JSON 格式）
        const inputSchemaObj = JSON.parse(tool.input_schema);
        const outputSchemaObj = JSON.parse(tool.output_schema);

        // 将 JSON Schema 转换为 Zod schema
        const inputSchema = jsonSchemaToZod(inputSchemaObj);
        const outputSchema = jsonSchemaToZod(outputSchemaObj);

        server.registerTool(
          tool.name,
          {
            description: tool.description,
            inputSchema,
            outputSchema,
          },
          async ({ input }) => {
            // TODO: 实现实际的工具回调逻辑
            return {
              content: [{ type: 'text', text: `测试: ${JSON.stringify(input)}` }],
            };
          }
        );
      } catch (error) {
        consola.error(`[MCP][${config.name}] 注册工具 ${tool.name} 失败:`, error);
        consola.error(`  输入 schema: ${tool.input_schema}`);
        consola.error(`  输出 schema: ${tool.output_schema}`);
        if (error instanceof Error) {
          consola.error(`  错误详情: ${error.message}`);
        }
      }
    });

    return server;
  };
}

/**
 * 批量创建 MCP 服务并返回 handlers 映射
 */
export async function createMcpServices(): Promise<Map<number, McpHandlers>> {
  const databaseClient = await getDatabaseClient();
  const allConfigsWithTools = await databaseClient.getAllConfigsWithTools();

  const handlersMap = new Map<number, McpHandlers>();
  let successCount = 0;
  let skipCount = 0;

  for (const config of allConfigsWithTools) {
    if (!config.id) {
      consola.warn(`[MCP] 配置 "${config.name}" 缺少 ID，跳过`);
      skipCount++;
      continue;
    }

    if (config.status !== StatusEnum.RUNNING) {
      consola.warn(`[MCP] 配置 "${config.name}" 状态为 "${config.status}"，跳过`);
      skipCount++;
      continue;
    }

    try {
      const serverFactory = createMcpServerFactory(config);
      const handlers = sseHandlers(serverFactory, {
        onError: (error: Error, sessionId?: string) => {
          consola.error(`[SSE][${config.name}][${sessionId || 'unknown'}]`, error);
        },
        onClose: (sessionId: string) => {
          consola.log(`[SSE][${config.name}] 连接关闭: ${sessionId}`);
        },
      });

      handlersMap.set(config.id, handlers);
      successCount++;
      consola.success(`[MCP] 已加载配置: ${config.name} (ID: ${config.id}, 工具数: ${config.tools.length})`);
    } catch (error) {
      consola.error(`[MCP] 加载配置 "${config.name}" (ID: ${config.id}) 失败:`, error);
      skipCount++;
    }
  }

  consola.info(`[MCP] 服务初始化完成: 成功 ${successCount} 个, 跳过 ${skipCount} 个`);
  return handlersMap;
}

/**
 * 刷新 MCP 服务（重新加载所有配置）
 */
export async function refreshMcpServices(handlersMap: Map<number, McpHandlers>): Promise<void> {
  handlersMap.clear();
  const newHandlersMap = await createMcpServices();
  newHandlersMap.forEach((handlers, id) => {
    handlersMap.set(id, handlers);
  });
}

// ==================== MCP 路由处理 ====================

/**
 * 从请求 Header 中解析 MCP_ID
 */
function parseMcpIdFromHeader(req: express.Request): number | null {
  const mcpIdHeader = req.headers['mcp_id'] || req.headers['MCP_ID'];

  if (!mcpIdHeader) {
    return null;
  }

  const mcpIdStr = typeof mcpIdHeader === 'string' ? mcpIdHeader : mcpIdHeader[0];
  const mcpId = parseInt(mcpIdStr, 10);

  return isNaN(mcpId) ? null : mcpId;
}

/**
 * 根据 MCP_ID 获取对应的 handlers
 */
function getHandlersByMcpId(
  mcpId: number,
  handlersMap: Map<number, McpHandlers>
): McpHandlers | null {
  return handlersMap.get(mcpId) || null;
}

/**
 * 创建路由处理器（根据 MCP_ID 选择对应的 handler）
 */
export function createMcpRouteHandler(
  handlersMap: Map<number, McpHandlers>,
  handlerType: 'get' | 'post'
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 解析 MCP_ID
    const mcpId = parseMcpIdFromHeader(req);

    if (mcpId === null) {
      res.status(400).json({
        error: '缺少或无效的 MCP_ID header 参数',
        message: '请在请求 Header 中添加 MCP_ID 或 mcp_id 参数（数字类型）',
      });
      return;
    }

    // 获取对应的 handlers
    const handlers = getHandlersByMcpId(mcpId, handlersMap);

    if (!handlers) {
      res.status(404).json({
        error: `未找到 ID 为 ${mcpId} 的 MCP 配置`,
        message: `请检查 MCP_ID 是否正确，当前可用的 MCP ID: ${Array.from(handlersMap.keys()).join(', ')}`,
      });
      return;
    }

    // 调用对应的 handler
    const targetHandler = handlerType === 'get' ? handlers.getHandler : handlers.postHandler;
    targetHandler(req, res, next);
  };
}
