import { ApiEnum } from "@jd-wmfe/honeycomb-common";
import type express from "express";
import type { McpHandlers } from "../mcp";
import { asyncHandler } from "../middleware/errorHandler";
import {
  createConfigHandler,
  deleteConfigHandler,
  getConfigByIdHandler,
  getConfigsHandler,
  startConfigHandler,
  stopConfigHandler,
  updateConfigHandler,
} from "./configs";

/**
 * 注册所有路由
 */
export function registerRoutes(app: express.Application, handlersMap: Map<number, McpHandlers>) {
  // REST API 路由（使用 asyncHandler 自动捕获异步错误）
  app.get(
    ApiEnum.QUERY_CONFIGS,
    asyncHandler((req, res) => getConfigsHandler(req, res, handlersMap))
  );
  app.get(ApiEnum.QUERY_CONFIG, asyncHandler(getConfigByIdHandler));
  app.post(
    ApiEnum.CREATE_CONFIG,
    asyncHandler((req, res) => createConfigHandler(req, res, handlersMap))
  );
  app.put(
    ApiEnum.UPDATE_CONFIG,
    asyncHandler((req, res) => updateConfigHandler(req, res, handlersMap))
  );
  app.delete(
    ApiEnum.DELETE_CONFIG,
    asyncHandler((req, res) => deleteConfigHandler(req, res, handlersMap))
  );
  app.post(
    ApiEnum.START_CONFIG,
    asyncHandler((req, res) => startConfigHandler(req, res, handlersMap))
  );
  app.post(
    ApiEnum.STOP_CONFIG,
    asyncHandler((req, res) => stopConfigHandler(req, res, handlersMap))
  );
}
