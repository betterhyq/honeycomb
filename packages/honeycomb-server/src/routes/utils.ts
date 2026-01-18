import consola from "consola";
import type express from "express";
import { BadRequestError } from "../middleware/errorHandler";

/**
 * API 响应格式
 */
export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

/**
 * 解析路由参数中的 ID
 */
export function parseIdParam(req: express.Request): number | null {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idParam || "", 10);
  return Number.isNaN(id) ? null : id;
}

/**
 * 验证 ID 参数，如果无效则抛出 BadRequestError
 * @returns 有效的 ID
 * @throws {BadRequestError} 如果 ID 无效
 */
export function validateIdParam(req: express.Request): number {
  const id = parseIdParam(req);
  if (id === null) {
    throw new BadRequestError("无效的配置 ID");
  }
  return id;
}

/**
 * @deprecated 使用 validateIdParam 替代，它会抛出错误而不是返回响应
 * 验证 ID 参数，如果无效则返回 400 响应（保留用于向后兼容）
 */
export function validateIdParamLegacy(req: express.Request, res: express.Response): number | null {
  try {
    return validateIdParam(req);
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({
        code: 400,
        msg: error.message,
        data: null,
      });
      return null;
    }
    throw error;
  }
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    code: 200,
    msg: "success",
    data,
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(code: number, msg: string, error?: Error): ApiResponse<null> {
  const errorMsg = error instanceof Error ? error.message : msg;
  return {
    code,
    msg: errorMsg,
    data: null,
  };
}

/**
 * 处理错误并发送错误响应
 */
export function handleError(
  res: express.Response,
  error: unknown,
  defaultMsg: string,
  context?: string
): void {
  const errorMsg = error instanceof Error ? error.message : defaultMsg;
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (context) {
    consola.error(`[API] ${context}:`, {
      message: errorMsg,
      name: errorName,
      stack: errorStack,
      originalError: error,
    });
  } else {
    consola.error("[API] 操作失败:", {
      message: errorMsg,
      name: errorName,
      stack: errorStack,
      originalError: error,
    });
  }
  res.status(500).json(createErrorResponse(500, errorMsg, error as Error));
}
