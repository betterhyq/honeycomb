import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConfigs, getConfigById, createConfig, updateConfig, deleteConfig, startConfig, stopConfig } from "./configs";
import { ApiEnum } from "@jd-wmfe/honeycomb-common";
import * as requestModule from "../request";
import * as urlModule from "../utils/url";

// Mock 模块
vi.mock("../request");
vi.mock("../utils/url");

describe("configs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigs", () => {
    it("应该调用正确的 API 端点", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: [],
      };

      vi.spyOn(requestModule, "get").mockResolvedValue(mockResponse);

      const result = await getConfigs();

      expect(requestModule.get).toHaveBeenCalledWith(ApiEnum.QUERY_CONFIGS);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getConfigById", () => {
    it("应该替换 URL 参数并调用 API", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: { id: 1, name: "test" },
      };

      const replacedUrl = "/api/configs/123";
      vi.spyOn(urlModule, "replaceUrlParams").mockReturnValue(replacedUrl);
      vi.spyOn(requestModule, "get").mockResolvedValue(mockResponse);

      const result = await getConfigById(123);

      expect(urlModule.replaceUrlParams).toHaveBeenCalledWith(ApiEnum.QUERY_CONFIG, { id: 123 });
      expect(requestModule.get).toHaveBeenCalledWith(replacedUrl);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createConfig", () => {
    it("应该发送 POST 请求创建配置", async () => {
      const mockResponse = {
        code: 201,
        msg: "success",
        data: { id: 1, name: "test" },
      };

      const configData = {
        name: "test-service",
        version: "1.0.0",
        description: "Test",
        tools: [],
      };

      vi.spyOn(requestModule, "post").mockResolvedValue(mockResponse);

      const result = await createConfig(configData);

      expect(requestModule.post).toHaveBeenCalledWith(ApiEnum.CREATE_CONFIG, configData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateConfig", () => {
    it("应该替换 URL 参数并发送 PUT 请求", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: { id: 123, name: "updated" },
      };

      const replacedUrl = "/api/config/123";
      const updateData = {
        name: "updated-service",
        version: "2.0.0",
        description: "Updated",
        tools: [],
      };

      vi.spyOn(urlModule, "replaceUrlParams").mockReturnValue(replacedUrl);
      vi.spyOn(requestModule, "put").mockResolvedValue(mockResponse);

      const result = await updateConfig(123, updateData);

      expect(urlModule.replaceUrlParams).toHaveBeenCalledWith(ApiEnum.UPDATE_CONFIG, { id: 123 });
      expect(requestModule.put).toHaveBeenCalledWith(replacedUrl, { id: 123, ...updateData });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteConfig", () => {
    it("应该替换 URL 参数并发送 DELETE 请求", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: null,
      };

      const replacedUrl = "/api/config/123";
      vi.spyOn(urlModule, "replaceUrlParams").mockReturnValue(replacedUrl);
      vi.spyOn(requestModule, "del").mockResolvedValue(mockResponse);

      const result = await deleteConfig(123);

      expect(urlModule.replaceUrlParams).toHaveBeenCalledWith(ApiEnum.DELETE_CONFIG, { id: 123 });
      expect(requestModule.del).toHaveBeenCalledWith(replacedUrl);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("startConfig", () => {
    it("应该替换 URL 参数并发送 POST 请求", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: { id: 123, status: "running" },
      };

      const replacedUrl = "/api/config/123/start";
      vi.spyOn(urlModule, "replaceUrlParams").mockReturnValue(replacedUrl);
      vi.spyOn(requestModule, "post").mockResolvedValue(mockResponse);

      const result = await startConfig(123);

      expect(urlModule.replaceUrlParams).toHaveBeenCalledWith(ApiEnum.START_CONFIG, { id: 123 });
      expect(requestModule.post).toHaveBeenCalledWith(replacedUrl);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("stopConfig", () => {
    it("应该替换 URL 参数并发送 POST 请求", async () => {
      const mockResponse = {
        code: 200,
        msg: "success",
        data: { id: 123, status: "stopped" },
      };

      const replacedUrl = "/api/config/123/stop";
      vi.spyOn(urlModule, "replaceUrlParams").mockReturnValue(replacedUrl);
      vi.spyOn(requestModule, "post").mockResolvedValue(mockResponse);

      const result = await stopConfig(123);

      expect(urlModule.replaceUrlParams).toHaveBeenCalledWith(ApiEnum.STOP_CONFIG, { id: 123 });
      expect(requestModule.post).toHaveBeenCalledWith(replacedUrl);
      expect(result).toEqual(mockResponse);
    });
  });
});
