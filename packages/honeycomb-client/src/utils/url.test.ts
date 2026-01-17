import { describe, it, expect } from "vitest";
import { replaceUrlParams } from "./url";

describe("replaceUrlParams", () => {
  it("应该替换单个参数", () => {
    const url = "/api/configs/:id";
    const params = { id: 123 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs/123");
  });

  it("应该替换多个参数", () => {
    const url = "/api/:type/:id/action";
    const params = { type: "config", id: 123 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/config/123/action");
  });

  it("应该处理字符串参数", () => {
    const url = "/api/configs/:id";
    const params = { id: "123" };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs/123");
  });

  it("应该处理数字参数", () => {
    const url = "/api/configs/:id";
    const params = { id: 456 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs/456");
  });

  it("应该处理不存在的参数（不替换）", () => {
    const url = "/api/configs/:id";
    const params = { other: 123 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs/:id");
  });

  it("应该处理没有参数的 URL", () => {
    const url = "/api/configs";
    const params = { id: 123 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs");
  });

  it("应该处理空参数对象", () => {
    const url = "/api/configs/:id";
    const params = {};
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/configs/:id");
  });

  it("应该处理重复的参数名", () => {
    const url = "/api/:id/configs/:id";
    const params = { id: 123 };
    const result = replaceUrlParams(url, params);

    // 注意：当前实现会替换所有匹配的参数
    expect(result).toBe("/api/123/configs/123");
  });

  it("应该处理复杂的 URL 路径", () => {
    const url = "/api/config/:id/start";
    const params = { id: 789 };
    const result = replaceUrlParams(url, params);

    expect(result).toBe("/api/config/789/start");
  });
});
