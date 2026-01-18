import consola from "consola";
import type { NextFunction, Request, Response } from "express";

/**
 * API 错误响应格式
 */
export type ErrorResponse = {
  code: number;
  msg: string;
  data: null;
};

/**
 * 自定义错误基类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: number,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code ?? statusCode;
    this.isOperational = isOperational;

    // 确保正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);

    // 捕获堆栈跟踪
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * 客户端错误（4xx）
 */
export class ClientError extends AppError {
  constructor(message: string, statusCode: number = 400, code?: number) {
    super(message, statusCode, code, true);
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * 服务器错误（5xx）
 */
export class ServerError extends AppError {
  constructor(message: string, statusCode: number = 500, code?: number) {
    super(message, statusCode, code, true);
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * 404 错误
 */
export class NotFoundError extends ClientError {
  constructor(message: string = "资源不存在") {
    super(message, 404, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 400 错误 - 请求参数错误
 */
export class BadRequestError extends ClientError {
  constructor(message: string = "请求参数错误") {
    super(message, 400, 400);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 500 错误 - 内部服务器错误
 */
export class InternalServerError extends ServerError {
  constructor(message: string = "服务器内部错误") {
    super(message, 500, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 创建标准化的错误响应
 */
function createErrorResponse(error: AppError | Error): ErrorResponse {
  if (error instanceof AppError) {
    return {
      code: error.code,
      msg: error.message,
      data: null,
    };
  }

  // 对于非 AppError 的错误，统一返回 500
  return {
    code: 500,
    msg: error.message || "服务器内部错误",
    data: null,
  };
}

/**
 * 记录错误日志
 */
function logError(error: AppError | Error, req: Request, includeStack: boolean = false): void {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const isOperational = isAppError ? error.isOperational : false;

  const errorInfo = {
    message: error.message,
    statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    ...(includeStack && error.stack ? { stack: error.stack } : {}),
  };

  // 根据错误类型和状态码选择日志级别
  if (statusCode >= 500) {
    // 服务器错误，记录详细信息包括堆栈
    consola.error("[ErrorHandler] 服务器错误:", errorInfo);
  } else if (statusCode >= 400) {
    // 客户端错误，记录基本信息
    consola.warn("[ErrorHandler] 客户端错误:", errorInfo);
  } else {
    // 其他错误
    consola.error("[ErrorHandler] 未知错误:", errorInfo);
  }

  // 如果是操作错误（可预期的错误），不在生产环境记录堆栈
  if (!isOperational && error.stack) {
    consola.debug("[ErrorHandler] 错误堆栈:", error.stack);
  }
}

/**
 * 统一错误处理中间件
 * 注意：必须是 Express 应用的最后一个中间件
 */
export function errorHandler(
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 如果响应已经发送，委托给 Express 默认错误处理
  if (res.headersSent) {
    next(error);
    return;
  }

  // 记录错误日志
  const includeStack = process.env.NODE_ENV !== "production";
  logError(error, req, includeStack);

  // 创建错误响应
  const errorResponse = createErrorResponse(error);

  // 确定 HTTP 状态码
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 异步路由处理器包装器
 * 自动捕获 Promise 拒绝并传递给错误处理中间件
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理中间件（当没有匹配的路由时）
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError(`路径 ${req.method} ${req.originalUrl} 不存在`);
  next(error);
}
