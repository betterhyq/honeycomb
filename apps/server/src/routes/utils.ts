import express from "express";
import consola from "consola";

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
  return isNaN(id) ? null : id;
}

/**
 * 验证 ID 参数，如果无效则返回 400 响应
 * @returns 如果 ID 无效返回 true，否则返回 false
 */
export function validateIdParam(req: express.Request, res: express.Response): number | null {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({
      code: 400,
      msg: "无效的配置 ID",
      data: null,
    });
    return null;
  }
  return id;
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
  context?: string,
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
