import express from "express";
import { ApiEnum } from "@jd-wmfe/honeycomb-type";
import type { McpHandlers } from "../mcp";
import {
  getConfigsHandler,
  getConfigByIdHandler,
  createConfigHandler,
  updateConfigHandler,
  deleteConfigHandler,
  startConfigHandler,
  stopConfigHandler,
} from "./configs";

/**
 * 注册所有路由
 */
export function registerRoutes(app: express.Application, handlersMap: Map<number, McpHandlers>) {
  // REST API 路由
  app.get(ApiEnum.QUERY_CONFIGS, (req, res) => getConfigsHandler(req, res, handlersMap));
  app.get(ApiEnum.QUERY_CONFIG, getConfigByIdHandler);
  app.post(ApiEnum.CREATE_CONFIG, (req, res) => createConfigHandler(req, res, handlersMap));
  app.put(ApiEnum.UPDATE_CONFIG, (req, res) => updateConfigHandler(req, res, handlersMap));
  app.delete(ApiEnum.DELETE_CONFIG, (req, res) => deleteConfigHandler(req, res, handlersMap));
  app.post(ApiEnum.START_CONFIG, (req, res) => startConfigHandler(req, res, handlersMap));
  app.post(ApiEnum.STOP_CONFIG, (req, res) => stopConfigHandler(req, res, handlersMap));
}
