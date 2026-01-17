import { describe, it, expect } from "vitest";
import { parseIdParam, validateIdParam, createSuccessResponse, createErrorResponse } from "./utils";
import { BadRequestError } from "../middleware/errorHandler";
import type { Request } from "express";

describe("routes/utils", () => {
  describe("parseIdParam", () => {
    it("应该正确解析数字 ID", () => {
      const req = {
        params: { id: "123" },
      } as unknown as Request;

      const id = parseIdParam(req);
      expect(id).toBe(123);
    });

    it("应该处理字符串数组参数", () => {
      const req = {
        params: { id: ["123"] },
      } as unknown as Request;

      const id = parseIdParam(req);
      expect(id).toBe(123);
    });

    it("应该返回 null 对于无效的 ID", () => {
      const req = {
        params: { id: "invalid" },
      } as unknown as Request;

      const id = parseIdParam(req);
      expect(id).toBeNull();
    });

    it("应该返回 null 对于缺失的 ID", () => {
      const req = {
        params: {},
      } as unknown as Request;

      const id = parseIdParam(req);
      expect(id).toBeNull();
    });

    it("应该返回 null 对于空字符串", () => {
      const req = {
        params: { id: "" },
      } as unknown as Request;

      const id = parseIdParam(req);
      expect(id).toBeNull();
    });
  });

  describe("validateIdParam", () => {
    it("应该返回有效的 ID", () => {
      const req = {
        params: { id: "123" },
      } as unknown as Request;

      const id = validateIdParam(req);
      expect(id).toBe(123);
    });

    it("应该抛出 BadRequestError 对于无效的 ID", () => {
      const req = {
        params: { id: "invalid" },
      } as unknown as Request;

      expect(() => validateIdParam(req)).toThrow(BadRequestError);
      expect(() => validateIdParam(req)).toThrow("无效的配置 ID");
    });

    it("应该抛出 BadRequestError 对于缺失的 ID", () => {
      const req = {
        params: {},
      } as unknown as Request;

      expect(() => validateIdParam(req)).toThrow(BadRequestError);
    });
  });

  describe("createSuccessResponse", () => {
    it("应该创建成功响应", () => {
      const data = { id: 1, name: "test" };
      const response = createSuccessResponse(data);

      expect(response.code).toBe(200);
      expect(response.msg).toBe("success");
      expect(response.data).toEqual(data);
    });

    it("应该支持 null 数据", () => {
      const response = createSuccessResponse(null);

      expect(response.code).toBe(200);
      expect(response.msg).toBe("success");
      expect(response.data).toBeNull();
    });

    it("应该支持数组数据", () => {
      const data = [1, 2, 3];
      const response = createSuccessResponse(data);

      expect(response.data).toEqual(data);
    });
  });

  describe("createErrorResponse", () => {
    it("应该创建错误响应", () => {
      const response = createErrorResponse(400, "Bad Request");

      expect(response.code).toBe(400);
      expect(response.msg).toBe("Bad Request");
      expect(response.data).toBeNull();
    });

    it("应该处理 Error 对象", () => {
      const error = new Error("Test error");
      const response = createErrorResponse(500, "Internal Server Error", error);

      expect(response.code).toBe(500);
      expect(response.msg).toBe("Test error");
      expect(response.data).toBeNull();
    });

    it("应该使用默认消息当 Error 对象不存在时", () => {
      const response = createErrorResponse(500, "Internal Server Error");

      expect(response.code).toBe(500);
      expect(response.msg).toBe("Internal Server Error");
    });
  });
});
