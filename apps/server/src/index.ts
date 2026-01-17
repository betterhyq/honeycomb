import express from 'express';
import consola from 'consola';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sseHandlers } from 'express-mcp-handler';
import { getDatabaseClient } from '@jd-wmfe/honeycomb-database';
import { z } from 'zod';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================
type McpHandlers = ReturnType<typeof sseHandlers>;

// 配置类型（包含工具列表）- 数据库格式（snake_case）
interface ConfigWithTools {
  id?: number;
  name: string;
  version: string;
  status: string;
  status_text: string;
  description: string;
  created_at: string;
  last_modified: string;
  tools: Array<{
    id?: number;
    config_id: number;
    name: string;
    description: string;
    input_schema: string;
    output_schema: string;
    callback: string;
  }>;
}

// 客户端格式（camelCase）
interface ClientConfig {
  id: number;
  name: string;
  version: string;
  status: 'running' | 'stopped';
  statusText: string;
  description: string;
  tools: Array<{
    id: number;
    name: string;
    description: string;
    inputSchema: string;
    outputSchema: string;
    callback: string;
  }>;
  createdAt: string;
  lastModified: string;
}

// API 响应格式
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// ==================== 数据格式转换 ====================

/**
 * 将数据库格式（snake_case）转换为客户端格式（camelCase）
 */
function dbToClientFormat(dbConfig: ConfigWithTools): ClientConfig {
  return {
    id: dbConfig.id!,
    name: dbConfig.name,
    version: dbConfig.version,
    status: dbConfig.status as 'running' | 'stopped',
    statusText: dbConfig.status_text,
    description: dbConfig.description,
    tools: dbConfig.tools.map((tool) => ({
      id: tool.id!,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
      outputSchema: tool.output_schema,
      callback: tool.callback,
    })),
    createdAt: dbConfig.created_at,
    lastModified: dbConfig.last_modified,
  };
}

/**
 * 将客户端格式（camelCase）转换为数据库格式（snake_case）
 */
function clientToDbFormat(clientConfig: Partial<ClientConfig>): Partial<ConfigWithTools> {
  const dbConfig: Partial<ConfigWithTools> = {};

  if (clientConfig.name !== undefined) dbConfig.name = clientConfig.name;
  if (clientConfig.version !== undefined) dbConfig.version = clientConfig.version;
  if (clientConfig.status !== undefined) {
    dbConfig.status = clientConfig.status;
    dbConfig.status_text = clientConfig.statusText || (clientConfig.status === 'running' ? '运行中' : '已停止');
  }
  if (clientConfig.statusText !== undefined) dbConfig.status_text = clientConfig.statusText;
  if (clientConfig.description !== undefined) dbConfig.description = clientConfig.description;
  if (clientConfig.createdAt !== undefined) dbConfig.created_at = clientConfig.createdAt;
  if (clientConfig.lastModified !== undefined) dbConfig.last_modified = clientConfig.lastModified;

  return dbConfig;
}

// ==================== MCP 服务管理 ====================

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

/**
 * 创建 MCP 服务器工厂函数
 */
function createMcpServerFactory(config: ConfigWithTools) {
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
async function createMcpServices(): Promise<Map<number, McpHandlers>> {
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

// ==================== 请求处理 ====================

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
function createMcpRouteHandler(
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

// ==================== REST API 路由 ====================

/**
 * 刷新 MCP 服务（重新加载所有配置）
 */
async function refreshMcpServices(handlersMap: Map<number, McpHandlers>): Promise<void> {
  handlersMap.clear();
  const newHandlersMap = await createMcpServices();
  newHandlersMap.forEach((handlers, id) => {
    handlersMap.set(id, handlers);
  });
}

/**
 * GET /api/configs - 获取所有配置（带工具）
 */
async function getConfigsHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const databaseClient = await getDatabaseClient();
    const dbConfigs = await databaseClient.getAllConfigsWithTools();

    const clientConfigs = dbConfigs.map(dbToClientFormat);

    const response: ApiResponse<ClientConfig[]> = {
      code: 200,
      msg: 'success',
      data: clientConfigs,
    };

    res.json(response);
  } catch (error) {
    consola.error('[API] 获取配置列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '获取配置列表失败',
      data: null,
    });
  }
}

/**
 * GET /api/configs/:id - 获取单个配置（带工具）
 */
async function getConfigByIdHandler(req: express.Request, res: express.Response) {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '', 10);
    if (isNaN(id)) {
      res.status(400).json({
        code: 400,
        msg: '无效的配置 ID',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();
    const dbConfig = await databaseClient.getConfigWithTools(id);

    if (!dbConfig) {
      res.status(404).json({
        code: 404,
        msg: '配置不存在',
        data: null,
      });
      return;
    }

    const clientConfig = dbToClientFormat(dbConfig);

    const response: ApiResponse<ClientConfig> = {
      code: 200,
      msg: 'success',
      data: clientConfig,
    };

    res.json(response);
  } catch (error) {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    consola.error(`[API] 获取配置 ${idParam} 失败:`, error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '获取配置失败',
      data: null,
    });
  }
}

/**
 * POST /api/configs - 创建配置
 */
async function createConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const clientConfig = req.body as Partial<ClientConfig>;

    // 验证必填字段
    if (!clientConfig.name || !clientConfig.version || !clientConfig.description) {
      res.status(400).json({
        code: 400,
        msg: '缺少必填字段：name, version, description',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();
    const now = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(/\//g, '-');

    // 转换格式
    const dbConfig: Omit<ConfigWithTools, 'tools'> = {
      name: clientConfig.name,
      version: clientConfig.version,
      status: clientConfig.status || 'stopped',
      status_text: clientConfig.statusText || (clientConfig.status === 'running' ? '运行中' : '已停止'),
      description: clientConfig.description,
      created_at: clientConfig.createdAt || now,
      last_modified: clientConfig.lastModified || now,
    };

    // 创建配置
    const configId = await databaseClient.createConfig(dbConfig);

    // 创建工具
    if (clientConfig.tools && clientConfig.tools.length > 0) {
      for (const tool of clientConfig.tools) {
        await databaseClient.createTool({
          config_id: configId,
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema || '',
          output_schema: tool.outputSchema || '',
          callback: tool.callback || '',
        });
      }
    }

    // 保存数据库
    await databaseClient.save();

    // 刷新 MCP 服务
    await refreshMcpServices(handlersMap);

    // 获取新创建的配置
    const newDbConfig = await databaseClient.getConfigWithTools(configId);
    if (!newDbConfig) {
      throw new Error('创建配置后无法获取配置数据');
    }

    const response: ApiResponse<ClientConfig> = {
      code: 200,
      msg: 'success',
      data: dbToClientFormat(newDbConfig),
    };

    res.status(201).json(response);
  } catch (error) {
    consola.error('[API] 创建配置失败:', error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '创建配置失败',
      data: null,
    });
  }
}

/**
 * PUT /api/configs/:id - 更新配置
 */
async function updateConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '', 10);
    if (isNaN(id)) {
      res.status(400).json({
        code: 400,
        msg: '无效的配置 ID',
        data: null,
      });
      return;
    }

    const clientConfig = req.body as Partial<ClientConfig>;
    const databaseClient = await getDatabaseClient();

    // 检查配置是否存在
    const existingConfig = await databaseClient.getConfigById(id);
    if (!existingConfig) {
      res.status(404).json({
        code: 404,
        msg: '配置不存在',
        data: null,
      });
      return;
    }

    // 转换格式并更新配置
    const dbConfig = clientToDbFormat(clientConfig);
    if (Object.keys(dbConfig).length > 0) {
      // 更新最后修改时间
      dbConfig.last_modified = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\//g, '-');

      await databaseClient.updateConfig(id, dbConfig);
    }

    // 更新工具（如果有）
    if (clientConfig.tools !== undefined) {
      // 获取现有工具
      const existingTools = await databaseClient.getToolsByConfigId(id);
      const existingToolIds = new Set(existingTools.map((t) => t.id!));
      const newToolIds = new Set(clientConfig.tools.map((t) => t.id).filter((id) => id !== undefined));

      // 删除不再存在的工具
      for (const tool of existingTools) {
        if (tool.id && !newToolIds.has(tool.id)) {
          await databaseClient.deleteTool(tool.id);
        }
      }

      // 更新或创建工具
      for (const tool of clientConfig.tools) {
        if (tool.id && existingToolIds.has(tool.id)) {
          // 更新现有工具
          await databaseClient.updateTool(tool.id, {
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
            output_schema: tool.outputSchema,
            callback: tool.callback,
          });
        } else {
          // 创建新工具
          await databaseClient.createTool({
            config_id: id,
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema || '',
            output_schema: tool.outputSchema || '',
            callback: tool.callback || '',
          });
        }
      }
    }

    // 保存数据库
    await databaseClient.save();

    // 刷新 MCP 服务
    await refreshMcpServices(handlersMap);

    // 获取更新后的配置
    const updatedDbConfig = await databaseClient.getConfigWithTools(id);
    if (!updatedDbConfig) {
      throw new Error('更新配置后无法获取配置数据');
    }

    const response: ApiResponse<ClientConfig> = {
      code: 200,
      msg: 'success',
      data: dbToClientFormat(updatedDbConfig),
    };

    res.json(response);
  } catch (error) {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    consola.error(`[API] 更新配置 ${idParam} 失败:`, error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '更新配置失败',
      data: null,
    });
  }
}

/**
 * DELETE /api/configs/:id - 删除配置
 */
async function deleteConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '', 10);
    if (isNaN(id)) {
      res.status(400).json({
        code: 400,
        msg: '无效的配置 ID',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();

    // 检查配置是否存在
    const existingConfig = await databaseClient.getConfigById(id);
    if (!existingConfig) {
      res.status(404).json({
        code: 404,
        msg: '配置不存在',
        data: null,
      });
      return;
    }

    // 删除配置（会级联删除工具）
    await databaseClient.deleteConfig(id);

    // 保存数据库
    await databaseClient.save();

    // 刷新 MCP 服务
    await refreshMcpServices(handlersMap);

    const response: ApiResponse<null> = {
      code: 200,
      msg: 'success',
      data: null,
    };

    res.json(response);
  } catch (error) {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    consola.error(`[API] 删除配置 ${idParam} 失败:`, error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '删除配置失败',
      data: null,
    });
  }
}

/**
 * POST /api/configs/:id/start - 启动服务
 */
async function startConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '', 10);
    if (isNaN(id)) {
      res.status(400).json({
        code: 400,
        msg: '无效的配置 ID',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();

    // 检查配置是否存在
    const existingConfig = await databaseClient.getConfigById(id);
    if (!existingConfig) {
      res.status(404).json({
        code: 404,
        msg: '配置不存在',
        data: null,
      });
      return;
    }

    // 更新状态
    await databaseClient.updateConfig(id, {
      status: 'running',
      status_text: '运行中',
      last_modified: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\//g, '-'),
    });

    // 保存数据库
    await databaseClient.save();

    // 刷新 MCP 服务
    await refreshMcpServices(handlersMap);

    // 获取更新后的配置
    const updatedDbConfig = await databaseClient.getConfigWithTools(id);
    if (!updatedDbConfig) {
      throw new Error('启动服务后无法获取配置数据');
    }

    const response: ApiResponse<ClientConfig> = {
      code: 200,
      msg: 'success',
      data: dbToClientFormat(updatedDbConfig),
    };

    res.json(response);
  } catch (error) {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    consola.error(`[API] 启动服务 ${idParam} 失败:`, error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '启动服务失败',
      data: null,
    });
  }
}

/**
 * POST /api/configs/:id/stop - 停止服务
 */
async function stopConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '', 10);
    if (isNaN(id)) {
      res.status(400).json({
        code: 400,
        msg: '无效的配置 ID',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();

    // 检查配置是否存在
    const existingConfig = await databaseClient.getConfigById(id);
    if (!existingConfig) {
      res.status(404).json({
        code: 404,
        msg: '配置不存在',
        data: null,
      });
      return;
    }

    // 更新状态
    await databaseClient.updateConfig(id, {
      status: 'stopped',
      status_text: '已停止',
      last_modified: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\//g, '-'),
    });

    // 保存数据库
    await databaseClient.save();

    // 刷新 MCP 服务
    await refreshMcpServices(handlersMap);

    // 获取更新后的配置
    const updatedDbConfig = await databaseClient.getConfigWithTools(id);
    if (!updatedDbConfig) {
      throw new Error('停止服务后无法获取配置数据');
    }

    const response: ApiResponse<ClientConfig> = {
      code: 200,
      msg: 'success',
      data: dbToClientFormat(updatedDbConfig),
    };

    res.json(response);
  } catch (error) {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    consola.error(`[API] 停止服务 ${idParam} 失败:`, error);
    res.status(500).json({
      code: 500,
      msg: error instanceof Error ? error.message : '停止服务失败',
      data: null,
    });
  }
}

// ==================== Swagger 配置 ====================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Honeycomb MCP Server API',
      version: '1.0.0',
      description: 'Honeycomb MCP 服务配置管理 API 文档',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: '本地开发服务器',
      },
    ],
    components: {
      schemas: {
        ClientConfig: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '配置 ID',
            },
            name: {
              type: 'string',
              description: '服务名称',
            },
            version: {
              type: 'string',
              description: '版本号',
              example: '1.0.0',
            },
            status: {
              type: 'string',
              enum: ['running', 'stopped'],
              description: '服务状态',
            },
            statusText: {
              type: 'string',
              description: '状态文本',
              example: '运行中',
            },
            description: {
              type: 'string',
              description: '服务描述',
            },
            tools: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Tool',
              },
              description: '工具列表',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            lastModified: {
              type: 'string',
              format: 'date-time',
              description: '最后修改时间',
            },
          },
          required: ['id', 'name', 'version', 'status', 'statusText', 'description', 'tools'],
        },
        Tool: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '工具 ID',
            },
            name: {
              type: 'string',
              description: '工具名称',
            },
            description: {
              type: 'string',
              description: '工具描述',
            },
            inputSchema: {
              type: 'string',
              description: '输入 Schema（JSON Schema 字符串）',
            },
            outputSchema: {
              type: 'string',
              description: '输出 Schema（JSON Schema 字符串）',
            },
            callback: {
              type: 'string',
              description: '回调函数代码',
            },
          },
          required: ['id', 'name', 'description'],
        },
        ApiResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: '响应代码',
            },
            msg: {
              type: 'string',
              description: '响应消息',
            },
            data: {
              type: 'object',
              description: '响应数据',
            },
          },
          required: ['code', 'msg'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: '错误代码',
            },
            msg: {
              type: 'string',
              description: '错误消息',
            },
            data: {
              type: 'null',
              description: '错误时数据为 null',
            },
          },
          required: ['code', 'msg', 'data'],
        },
      },
    },
    tags: [
      {
        name: 'Configs',
        description: 'MCP 服务配置管理',
      },
    ],
  },
  apis: ['./src/index.ts'], // 指向包含 JSDoc 注释的文件
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==================== 应用初始化 ====================

const app = express();
app.use(express.json());

// 批量创建 MCP 服务
const mcpHandlersMap = await createMcpServices();

// ==================== 路由配置 ====================

// Swagger UI 文档路由（需要在其他路由之前）
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Honeycomb API 文档',
}));

// REST API 路由（需要在静态文件之前）
/**
 * @swagger
 * /api/configs:
 *   get:
 *     summary: 获取所有配置（带工具）
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: 成功获取配置列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               code: 200
 *               msg: success
 *               data:
 *                 - id: 1
 *                   name: 文件系统服务
 *                   version: 1.0.0
 *                   status: running
 *                   statusText: 运行中
 *                   description: 提供文件搜索、读取、写入等文件系统操作功能
 *                   tools: []
 *                   createdAt: "2025-12-15 10:30:00"
 *                   lastModified: "2025-12-20 14:25:00"
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/configs', (req, res) => getConfigsHandler(req, res, mcpHandlersMap));

/**
 * @swagger
 * /api/configs/{id}:
 *   get:
 *     summary: 获取单个配置（带工具）
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 成功获取配置
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ClientConfig'
 *       400:
 *         description: 无效的配置 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 配置不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/configs/:id', getConfigByIdHandler);

/**
 * @swagger
 * /api/configs:
 *   post:
 *     summary: 创建新配置
 *     tags: [Configs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 服务名称
 *                 example: 文件系统服务
 *               version:
 *                 type: string
 *                 description: 版本号
 *                 example: 1.0.0
 *               status:
 *                 type: string
 *                 enum: [running, stopped]
 *                 description: 服务状态
 *                 example: stopped
 *               description:
 *                 type: string
 *                 description: 服务描述
 *                 example: 提供文件搜索、读取、写入等文件系统操作功能
 *               tools:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Tool'
 *                 description: 工具列表
 *             required:
 *               - name
 *               - version
 *               - description
 *           example:
 *             name: 文件系统服务
 *             version: 1.0.0
 *             status: stopped
 *             description: 提供文件搜索、读取、写入等文件系统操作功能
 *             tools: []
 *     responses:
 *       201:
 *         description: 成功创建配置
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ClientConfig'
 *       400:
 *         description: 缺少必填字段
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/configs', (req, res) => createConfigHandler(req, res, mcpHandlersMap));

/**
 * @swagger
 * /api/configs/{id}:
 *   put:
 *     summary: 更新配置
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 服务名称
 *               version:
 *                 type: string
 *                 description: 版本号
 *               status:
 *                 type: string
 *                 enum: [running, stopped]
 *                 description: 服务状态
 *               description:
 *                 type: string
 *                 description: 服务描述
 *               tools:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Tool'
 *                 description: 工具列表
 *     responses:
 *       200:
 *         description: 成功更新配置
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ClientConfig'
 *       400:
 *         description: 无效的配置 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 配置不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put('/api/configs/:id', (req, res) => updateConfigHandler(req, res, mcpHandlersMap));

/**
 * @swagger
 * /api/configs/{id}:
 *   delete:
 *     summary: 删除配置
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 成功删除配置
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               code: 200
 *               msg: success
 *               data: null
 *       400:
 *         description: 无效的配置 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 配置不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete('/api/configs/:id', (req, res) => deleteConfigHandler(req, res, mcpHandlersMap));

/**
 * @swagger
 * /api/configs/{id}/start:
 *   post:
 *     summary: 启动服务
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 成功启动服务
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ClientConfig'
 *       400:
 *         description: 无效的配置 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 配置不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/configs/:id/start', (req, res) => startConfigHandler(req, res, mcpHandlersMap));

/**
 * @swagger
 * /api/configs/{id}/stop:
 *   post:
 *     summary: 停止服务
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 成功停止服务
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ClientConfig'
 *       400:
 *         description: 无效的配置 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 配置不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/configs/:id/stop', (req, res) => stopConfigHandler(req, res, mcpHandlersMap));

// Mount the SSE endpoints (API routes should be before static files)
app.get('/sse', createMcpRouteHandler(mcpHandlersMap, 'get'));
app.post('/messages', createMcpRouteHandler(mcpHandlersMap, 'post'));

// Serve static files from client/dist
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Handle SPA routing: all non-API routes should return index.html
app.get('/', (req, res, next) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(3002, () => {
  console.log('Express MCP SSE server running on port 3002');
  console.log(`Serving client app from: ${clientDistPath}`);
});