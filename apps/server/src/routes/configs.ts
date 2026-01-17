import express from 'express';
import consola from 'consola';
import { getDatabaseClient } from '@jd-wmfe/honeycomb-database';
import type {
  QueryConfigsVO,
  QueryConfigVO,
  CreateConfigDTO,
  UpdateConfigDTO,
} from '@jd-wmfe/honeycomb-type';
import { StatusEnum } from '@jd-wmfe/honeycomb-type';
import type { McpHandlers } from '../mcp';
import { refreshMcpServices } from '../mcp';
import { dbToVO, createDtoToDb, updateDtoToDb, getCurrentTimeString } from '../utils';

// API 响应格式
type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

/**
 * GET /api/configs - 获取所有配置（带工具）
 */
export async function getConfigsHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 获取配置列表请求:', req.body);
  try {
    const databaseClient = await getDatabaseClient();
    const dbConfigs = await databaseClient.getAllConfigsWithTools();

    const configsVO: QueryConfigsVO = dbConfigs.map(dbToVO);

    const response: ApiResponse<QueryConfigsVO> = {
      code: 200,
      msg: 'success',
      data: configsVO,
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
export async function getConfigByIdHandler(req: express.Request, res: express.Response) {
  consola.info('[API] 获取单个配置请求:', req.params);
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

    const configVO = dbToVO(dbConfig);

    const response: ApiResponse<QueryConfigVO> = {
      code: 200,
      msg: 'success',
      data: configVO,
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
 * POST /api/config - 创建配置
 */
export async function createConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 创建配置请求:', req.body);
  try {
    const dto = req.body as CreateConfigDTO;

    // 验证必填字段
    if (!dto.name || !dto.version || !dto.description) {
      res.status(400).json({
        code: 400,
        msg: '缺少必填字段：name, version, description',
        data: null,
      });
      return;
    }

    const databaseClient = await getDatabaseClient();

    // 转换格式
    const dbConfig = createDtoToDb(dto, StatusEnum.STOPPED);

    // 创建配置
    const configId = await databaseClient.createConfig(dbConfig);

    // 创建工具
    if (dto.tools && dto.tools.length > 0) {
      const now = getCurrentTimeString();

      for (const tool of dto.tools) {
        await databaseClient.createTool({
          config_id: configId,
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
          output_schema: tool.output_schema,
          callback: tool.callback,
          created_at: now,
          last_modified: now,
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

    const response: ApiResponse<QueryConfigVO> = {
      code: 200,
      msg: 'success',
      data: dbToVO(newDbConfig),
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
 * PUT /api/config/:id - 更新配置
 */
export async function updateConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 更新配置请求:', req.params);
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

    const dto = req.body as UpdateConfigDTO;
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
    const dbConfig = updateDtoToDb(dto);
    await databaseClient.updateConfig(id, dbConfig);

    // 更新工具（如果有）
    if (dto.tools !== undefined) {
      // 获取现有工具
      const existingTools = await databaseClient.getToolsByConfigId(id);

      // 删除不再存在的工具（简化处理：删除所有旧工具，创建新工具）
      for (const tool of existingTools) {
        if (tool.id) {
          await databaseClient.deleteTool(tool.id);
        }
      }

      // 创建新工具
      const now = getCurrentTimeString();

      for (const tool of dto.tools) {
        await databaseClient.createTool({
          config_id: id,
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
          output_schema: tool.output_schema,
          callback: tool.callback,
          created_at: now,
          last_modified: now,
        });
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

    const response: ApiResponse<QueryConfigVO> = {
      code: 200,
      msg: 'success',
      data: dbToVO(updatedDbConfig),
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
 * DELETE /api/config/:id - 删除配置
 */
export async function deleteConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 删除配置请求:', req.params);
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
 * POST /api/config/:id/start - 启动服务
 */
export async function startConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 启动服务请求:', req.params);
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
      status: StatusEnum.RUNNING,
      last_modified: getCurrentTimeString(),
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

    const response: ApiResponse<QueryConfigVO> = {
      code: 200,
      msg: 'success',
      data: dbToVO(updatedDbConfig),
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
 * POST /api/config/:id/stop - 停止服务
 */
export async function stopConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  consola.info('[API] 停止服务请求:', req.params);
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
      status: StatusEnum.STOPPED,
      last_modified: getCurrentTimeString(),
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

    const response: ApiResponse<QueryConfigVO> = {
      code: 200,
      msg: 'success',
      data: dbToVO(updatedDbConfig),
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
