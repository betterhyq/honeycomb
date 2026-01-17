import { describe, it, expect } from "vitest";
import { ApiEnum, StatusEnum, StatusTextMap } from "./enum";

describe("ApiEnum", () => {
  it("应该包含所有 API 端点", () => {
    expect(ApiEnum.QUERY_CONFIGS).toBe("/api/configs");
    expect(ApiEnum.QUERY_CONFIG).toBe("/api/configs/:id");
    expect(ApiEnum.CREATE_CONFIG).toBe("/api/config");
    expect(ApiEnum.UPDATE_CONFIG).toBe("/api/config/:id");
    expect(ApiEnum.DELETE_CONFIG).toBe("/api/config/:id");
    expect(ApiEnum.START_CONFIG).toBe("/api/config/:id/start");
    expect(ApiEnum.STOP_CONFIG).toBe("/api/config/:id/stop");
  });

  it("所有枚举值应该是字符串", () => {
    Object.values(ApiEnum).forEach((value) => {
      expect(typeof value).toBe("string");
      expect(value.startsWith("/api/")).toBe(true);
    });
  });
});

describe("StatusEnum", () => {
  it("应该包含运行中和已停止状态", () => {
    expect(StatusEnum.RUNNING).toBe("running");
    expect(StatusEnum.STOPPED).toBe("stopped");
  });

  it("所有枚举值应该是字符串", () => {
    Object.values(StatusEnum).forEach((value) => {
      expect(typeof value).toBe("string");
    });
  });
});

describe("StatusTextMap", () => {
  it("应该正确映射状态到中文文本", () => {
    expect(StatusTextMap.get(StatusEnum.RUNNING)).toBe("运行中");
    expect(StatusTextMap.get(StatusEnum.STOPPED)).toBe("已停止");
  });

  it("应该包含所有状态枚举值", () => {
    Object.values(StatusEnum).forEach((status) => {
      expect(StatusTextMap.has(status)).toBe(true);
      expect(StatusTextMap.get(status)).toBeTruthy();
      expect(typeof StatusTextMap.get(status)).toBe("string");
    });
  });

  it("对于不存在的状态应该返回 undefined", () => {
    expect(StatusTextMap.get("unknown" as StatusEnum)).toBeUndefined();
  });
});
