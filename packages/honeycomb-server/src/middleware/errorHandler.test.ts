import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AppError,
  ClientError,
  ServerError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from "./errorHandler";
import type { Request, Response, NextFunction } from "express";

describe("errorHandler", () => {
  describe("AppError", () => {
    it("应该创建应用错误", () => {
      const error = new AppError("Test error", 400, 400);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it("应该使用默认值", () => {
      const error = new AppError("Test error");

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });

  describe("ClientError", () => {
    it("应该创建客户端错误", () => {
      const error = new ClientError("Bad request", 400);

      expect(error.message).toBe("Bad request");
      expect(error.statusCode).toBe(400);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ClientError);
    });

    it("应该使用默认状态码", () => {
      const error = new ClientError("Bad request");

      expect(error.statusCode).toBe(400);
    });
  });

  describe("ServerError", () => {
    it("应该创建服务器错误", () => {
      const error = new ServerError("Internal error", 500);

      expect(error.message).toBe("Internal error");
      expect(error.statusCode).toBe(500);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ServerError);
    });

    it("应该使用默认状态码", () => {
      const error = new ServerError("Internal error");

      expect(error.statusCode).toBe(500);
    });
  });

  describe("NotFoundError", () => {
    it("应该创建 404 错误", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(404);
      expect(error).toBeInstanceOf(ClientError);
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it("应该使用默认消息", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("资源不存在");
    });
  });

  describe("BadRequestError", () => {
    it("应该创建 400 错误", () => {
      const error = new BadRequestError("Invalid parameter");

      expect(error.message).toBe("Invalid parameter");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(400);
      expect(error).toBeInstanceOf(ClientError);
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it("应该使用默认消息", () => {
      const error = new BadRequestError();

      expect(error.message).toBe("请求参数错误");
    });
  });

  describe("InternalServerError", () => {
    it("应该创建 500 错误", () => {
      const error = new InternalServerError("Database error");

      expect(error.message).toBe("Database error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(500);
      expect(error).toBeInstanceOf(ServerError);
      expect(error).toBeInstanceOf(InternalServerError);
    });

    it("应该使用默认消息", () => {
      const error = new InternalServerError();

      expect(error.message).toBe("服务器内部错误");
    });
  });
});
