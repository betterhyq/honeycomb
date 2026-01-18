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
	const idParam = Array.isArray(req.params.id)
		? req.params.id[0]
		: req.params.id;
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
export function createErrorResponse(
	code: number,
	msg: string,
	error?: Error,
): ApiResponse<null> {
	const errorMsg = error instanceof Error ? error.message : msg;
	return {
		code,
		msg: errorMsg,
		data: null,
	};
}
