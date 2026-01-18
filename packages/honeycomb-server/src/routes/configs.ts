import type {
  CreateConfigDTO,
  QueryConfigsVO,
  QueryConfigVO,
  UpdateConfigDTO,
} from "@jd-wmfe/honeycomb-common";
import { StatusEnum } from "@jd-wmfe/honeycomb-common";
import { getDatabaseClient } from "@jd-wmfe/honeycomb-db";
import consola from "consola";
import type express from "express";
import type { McpHandlers } from "../mcp";
import { refreshMcpServices } from "../mcp";
import { BadRequestError, InternalServerError, NotFoundError } from "../middleware/errorHandler";
import { createDtoToDb, dbToVO, getCurrentTimeString, updateDtoToDb } from "../utils";
import { createSuccessResponse, validateIdParam } from "./utils";

/**
 * GET /api/configs - 获取所有配置（带工具）
 */
export async function getConfigsHandler(
  req: express.Request,
  res: express.Response,
  _handlersMap: Map<number, McpHandlers>
) {
  const startTime = Date.now();
  consola.info("[API] GET /api/configs - 开始获取配置列表");
  consola.debug("[API] 请求详情:", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: { "user-agent": req.headers["user-agent"] },
  });

  const databaseClient = await getDatabaseClient();
  const dbConfigs = await databaseClient.getAllConfigsWithTools();

  const configsVO: QueryConfigsVO = dbConfigs.map(dbToVO);
  const totalTools = configsVO.reduce((sum, config) => sum + config.tools.length, 0);
  const runningCount = configsVO.filter((c) => c.status === StatusEnum.RUNNING).length;
  const stoppedCount = configsVO.filter((c) => c.status === StatusEnum.STOPPED).length;

  const duration = Date.now() - startTime;
  consola.success(`[API] GET /api/configs - 成功获取配置列表 (耗时: ${duration}ms)`);
  consola.info(
    `[API] 统计信息: 配置总数=${configsVO.length}, 工具总数=${totalTools}, 运行中=${runningCount}, 已停止=${stoppedCount}`
  );

  res.json(createSuccessResponse(configsVO));
}

/**
 * GET /api/configs/:id - 获取单个配置（带工具）
 */
export async function getConfigByIdHandler(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const id = validateIdParam(req);

  consola.info(`[API] GET /api/configs/${id} - 开始获取配置详情`);
  consola.debug("[API] 请求详情:", {
    method: req.method,
    url: req.url,
    params: req.params,
    ip: req.ip,
  });

  const databaseClient = await getDatabaseClient();
  const dbConfig = await databaseClient.getConfigWithTools(id);

  if (!dbConfig) {
    const duration = Date.now() - startTime;
    consola.warn(`[API] GET /api/configs/${id} - 配置不存在 (耗时: ${duration}ms)`);
    throw new NotFoundError("配置不存在");
  }

  const configVO = dbToVO(dbConfig);
  const duration = Date.now() - startTime;
  consola.success(`[API] GET /api/configs/${id} - 成功获取配置详情 (耗时: ${duration}ms)`);
  consola.info(
    `[API] 配置信息: name=${configVO.name}, version=${configVO.version}, status=${configVO.status}, tools=${configVO.tools.length}`
  );

  res.json(createSuccessResponse(configVO));
}

/**
 * POST /api/config - 创建配置
 */
export async function createConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  const startTime = Date.now();
  consola.info("[API] POST /api/config - 开始创建配置");

  const dto = req.body as CreateConfigDTO;
  consola.debug("[API] 创建配置请求数据:", {
    name: dto.name,
    version: dto.version,
    description: dto.description?.substring(0, 50) + (dto.description?.length > 50 ? "..." : ""),
    toolsCount: dto.tools?.length || 0,
  });

  // 验证必填字段
  if (!dto.name || !dto.version || !dto.description) {
    const duration = Date.now() - startTime;
    consola.warn(`[API] POST /api/config - 缺少必填字段 (耗时: ${duration}ms)`);
    throw new BadRequestError("缺少必填字段：name, version, description");
  }

  const databaseClient = await getDatabaseClient();

  // 转换格式
  const dbConfig = createDtoToDb(dto, StatusEnum.STOPPED);
  consola.debug("[API] 转换后的数据库配置:", {
    ...dbConfig,
    description: dbConfig.description.substring(0, 50),
  });

  // 创建配置
  const configId = await databaseClient.createConfig(dbConfig);
  consola.info(`[API] 已创建配置记录，ID: ${configId}`);

  // 创建工具
  let toolsCreated = 0;
  if (dto.tools && dto.tools.length > 0) {
    const now = getCurrentTimeString();
    consola.info(`[API] 开始创建 ${dto.tools.length} 个工具`);

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
      toolsCreated++;
      consola.debug(`[API] 已创建工具: ${tool.name}`);
    }
    consola.success(`[API] 成功创建 ${toolsCreated} 个工具`);
  }

  // 保存数据库
  await databaseClient.save();
  consola.debug("[API] 数据库已保存");

  // 刷新 MCP 服务
  consola.info("[API] 开始刷新 MCP 服务");
  await refreshMcpServices(handlersMap);
  consola.success("[API] MCP 服务刷新完成");

  // 获取新创建的配置
  const newDbConfig = await databaseClient.getConfigWithTools(configId);
  if (!newDbConfig) {
    throw new InternalServerError("创建配置后无法获取配置数据");
  }

  const configVO = dbToVO(newDbConfig);
  const duration = Date.now() - startTime;
  consola.success(`[API] POST /api/config - 成功创建配置 (耗时: ${duration}ms)`);
  consola.info(
    `[API] 新配置详情: id=${configVO.id}, name=${configVO.name}, version=${configVO.version}, tools=${configVO.tools.length}`
  );

  res.status(201).json(createSuccessResponse(configVO));
}

/**
 * PUT /api/config/:id - 更新配置
 */
export async function updateConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  const startTime = Date.now();
  const id = validateIdParam(req);

  consola.info(`[API] PUT /api/config/${id} - 开始更新配置`);

  const dto = req.body as UpdateConfigDTO;
  consola.debug("[API] 更新配置请求数据:", {
    id,
    name: dto.name,
    version: dto.version,
    toolsCount: dto.tools?.length,
    hasName: !!dto.name,
    hasVersion: !!dto.version,
    hasDescription: !!dto.description,
  });

  const databaseClient = await getDatabaseClient();

  // 检查配置是否存在
  const existingConfig = await databaseClient.getConfigById(id);
  if (!existingConfig) {
    const duration = Date.now() - startTime;
    consola.warn(`[API] PUT /api/config/${id} - 配置不存在 (耗时: ${duration}ms)`);
    throw new NotFoundError("配置不存在");
  }

  consola.debug(
    `[API] 当前配置状态: name=${existingConfig.name}, version=${existingConfig.version}, status=${existingConfig.status}`
  );

  // 转换格式并更新配置
  const dbConfig = updateDtoToDb(dto);
  await databaseClient.updateConfig(id, dbConfig);
  consola.info(`[API] 配置基本信息已更新`);

  // 更新工具（如果有）
  let toolsUpdated = false;
  if (dto.tools !== undefined) {
    // 获取现有工具
    const existingTools = await databaseClient.getToolsByConfigId(id);
    consola.info(`[API] 当前工具数量: ${existingTools.length}, 新工具数量: ${dto.tools.length}`);

    // 删除不再存在的工具（简化处理：删除所有旧工具，创建新工具）
    let deletedCount = 0;
    for (const tool of existingTools) {
      if (tool.id) {
        await databaseClient.deleteTool(tool.id);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      consola.info(`[API] 已删除 ${deletedCount} 个旧工具`);
    }

    // 创建新工具
    const now = getCurrentTimeString();
    let createdCount = 0;
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
      createdCount++;
      consola.debug(`[API] 已创建工具: ${tool.name}`);
    }
    if (createdCount > 0) {
      consola.success(`[API] 成功创建 ${createdCount} 个新工具`);
    }
    toolsUpdated = true;
  }

  // 保存数据库
  await databaseClient.save();
  consola.debug("[API] 数据库已保存");

  // 刷新 MCP 服务
  consola.info("[API] 开始刷新 MCP 服务");
  await refreshMcpServices(handlersMap);
  consola.success("[API] MCP 服务刷新完成");

  // 获取更新后的配置
  const updatedDbConfig = await databaseClient.getConfigWithTools(id);
  if (!updatedDbConfig) {
    throw new InternalServerError("更新配置后无法获取配置数据");
  }

  const configVO = dbToVO(updatedDbConfig);
  const duration = Date.now() - startTime;
  consola.success(`[API] PUT /api/config/${id} - 成功更新配置 (耗时: ${duration}ms)`);
  consola.info(
    `[API] 更新后配置: name=${configVO.name}, version=${configVO.version}, status=${configVO.status}, tools=${configVO.tools.length}, toolsUpdated=${toolsUpdated}`
  );

  res.json(createSuccessResponse(configVO));
}

/**
 * DELETE /api/config/:id - 删除配置
 */
export async function deleteConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  const startTime = Date.now();
  const id = validateIdParam(req);

  consola.info(`[API] DELETE /api/config/${id} - 开始删除配置`);

  const databaseClient = await getDatabaseClient();

  // 检查配置是否存在
  const existingConfig = await databaseClient.getConfigById(id);
  if (!existingConfig) {
    const duration = Date.now() - startTime;
    consola.warn(`[API] DELETE /api/config/${id} - 配置不存在 (耗时: ${duration}ms)`);
    throw new NotFoundError("配置不存在");
  }

  // 获取关联的工具数量
  const existingTools = await databaseClient.getToolsByConfigId(id);
  consola.info(
    `[API] 准备删除配置: name=${existingConfig.name}, version=${existingConfig.version}, status=${existingConfig.status}, 关联工具数=${existingTools.length}`
  );

  // 删除配置（会级联删除工具）
  await databaseClient.deleteConfig(id);
  consola.info(`[API] 配置和 ${existingTools.length} 个工具已删除`);

  // 保存数据库
  await databaseClient.save();
  consola.debug("[API] 数据库已保存");

  // 刷新 MCP 服务
  consola.info("[API] 开始刷新 MCP 服务");
  await refreshMcpServices(handlersMap);
  consola.success("[API] MCP 服务刷新完成");

  const duration = Date.now() - startTime;
  consola.success(`[API] DELETE /api/config/${id} - 成功删除配置 (耗时: ${duration}ms)`);

  res.json(createSuccessResponse(null));
}

/**
 * 更新配置状态并刷新 MCP 服务的通用函数
 */
async function updateConfigStatus(
  id: number,
  newStatus: StatusEnum,
  handlersMap: Map<number, McpHandlers>,
  action: "启动" | "停止"
): Promise<QueryConfigVO> {
  const databaseClient = await getDatabaseClient();

  // 检查配置是否存在
  const existingConfig = await databaseClient.getConfigById(id);
  if (!existingConfig) {
    throw new NotFoundError("配置不存在");
  }

  consola.info(`[API] 当前服务状态: name=${existingConfig.name}, status=${existingConfig.status}`);

  // 检查状态是否已经是目标状态
  const targetStatus = newStatus === StatusEnum.RUNNING ? StatusEnum.RUNNING : StatusEnum.STOPPED;
  if (existingConfig.status === targetStatus) {
    const configWithTools = await databaseClient.getConfigWithTools(id);
    if (!configWithTools) {
      throw new InternalServerError("无法获取配置数据");
    }
    return dbToVO(configWithTools);
  }

  // 更新状态
  await databaseClient.updateConfig(id, {
    status: newStatus,
    last_modified: getCurrentTimeString(),
  });
  consola.info(`[API] 服务状态已更新为: ${newStatus}`);

  // 保存数据库
  await databaseClient.save();
  consola.debug("[API] 数据库已保存");

  // 刷新 MCP 服务
  consola.info("[API] 开始刷新 MCP 服务");
  await refreshMcpServices(handlersMap);
  consola.success("[API] MCP 服务刷新完成");

  // 获取更新后的配置
  const updatedDbConfig = await databaseClient.getConfigWithTools(id);
  if (!updatedDbConfig) {
    throw new InternalServerError(`${action}服务后无法获取配置数据`);
  }

  return dbToVO(updatedDbConfig);
}

/**
 * POST /api/config/:id/start - 启动服务
 */
export async function startConfigHandler(
  req: express.Request,
  res: express.Response,
  handlersMap: Map<number, McpHandlers>
) {
  const startTime = Date.now();
  const id = validateIdParam(req);

  consola.info(`[API] POST /api/config/${id}/start - 开始启动服务`);

  try {
    const configVO = await updateConfigStatus(id, StatusEnum.RUNNING, handlersMap, "启动");

    const duration = Date.now() - startTime;
    consola.success(`[API] POST /api/config/${id}/start - 成功启动服务 (耗时: ${duration}ms)`);
    consola.info(
      `[API] 服务已启动: name=${configVO.name}, version=${configVO.version}, tools=${configVO.tools.length}`
    );

    res.json(createSuccessResponse(configVO));
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof NotFoundError) {
      consola.warn(`[API] POST /api/config/${id}/start - 配置不存在 (耗时: ${duration}ms)`);
    } else if (error instanceof InternalServerError && error.message.includes("已在运行")) {
      consola.warn(`[API] POST /api/config/${id}/start - 服务已在运行中 (耗时: ${duration}ms)`);
    }
    throw error;
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
  const startTime = Date.now();
  const id = validateIdParam(req);

  consola.info(`[API] POST /api/config/${id}/stop - 开始停止服务`);

  try {
    const configVO = await updateConfigStatus(id, StatusEnum.STOPPED, handlersMap, "停止");

    const duration = Date.now() - startTime;
    consola.success(`[API] POST /api/config/${id}/stop - 成功停止服务 (耗时: ${duration}ms)`);
    consola.info(
      `[API] 服务已停止: name=${configVO.name}, version=${configVO.version}, tools=${configVO.tools.length}`
    );

    res.json(createSuccessResponse(configVO));
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof NotFoundError) {
      consola.warn(`[API] POST /api/config/${id}/stop - 配置不存在 (耗时: ${duration}ms)`);
    } else if (error instanceof InternalServerError && error.message.includes("已停止")) {
      consola.warn(`[API] POST /api/config/${id}/stop - 服务已停止 (耗时: ${duration}ms)`);
    }
    throw error;
  }
}
