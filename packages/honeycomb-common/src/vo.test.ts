import { describe, it, expect } from "vitest";
import type { QueryConfigsVO, QueryConfigVO } from "./vo";

describe("VO 类型验证", () => {
  describe("QueryConfigVO", () => {
    it("应该包含所有配置字段", () => {
      const vo: QueryConfigVO = {
        id: 1,
        name: "test-service",
        version: "1.0.0",
        status: "running",
        statusText: "运行中",
        description: "Test description",
        createdAt: "2024-01-01 00:00:00",
        lastModified: "2024-01-01 00:00:00",
        tools: [],
      };

      expect(vo.id).toBe(1);
      expect(vo.name).toBe("test-service");
      expect(vo.version).toBe("1.0.0");
      expect(vo.status).toBe("running");
      expect(vo.statusText).toBe("运行中");
      expect(vo.description).toBe("Test description");
      expect(vo.createdAt).toBe("2024-01-01 00:00:00");
      expect(vo.lastModified).toBe("2024-01-01 00:00:00");
      expect(Array.isArray(vo.tools)).toBe(true);
    });

    it("应该包含工具列表", () => {
      const vo: QueryConfigVO = {
        id: 1,
        name: "test-service",
        version: "1.0.0",
        status: "running",
        statusText: "运行中",
        description: "Test description",
        createdAt: "2024-01-01 00:00:00",
        lastModified: "2024-01-01 00:00:00",
        tools: [
          {
            name: "test-tool",
            description: "Tool description",
            input_schema: '{"type": "object"}',
            output_schema: '{"type": "object"}',
            callback: "async () => {}",
          },
        ],
      };

      expect(vo.tools.length).toBe(1);
      expect(vo.tools[0].name).toBe("test-tool");
      expect(vo.tools[0].description).toBe("Tool description");
    });
  });

  describe("QueryConfigsVO", () => {
    it("应该是 QueryConfigVO 数组", () => {
      const vos: QueryConfigsVO = [
        {
          id: 1,
          name: "service-1",
          version: "1.0.0",
          status: "running",
          statusText: "运行中",
          description: "Service 1",
          createdAt: "2024-01-01 00:00:00",
          lastModified: "2024-01-01 00:00:00",
          tools: [],
        },
        {
          id: 2,
          name: "service-2",
          version: "2.0.0",
          status: "stopped",
          statusText: "已停止",
          description: "Service 2",
          createdAt: "2024-01-02 00:00:00",
          lastModified: "2024-01-02 00:00:00",
          tools: [],
        },
      ];

      expect(Array.isArray(vos)).toBe(true);
      expect(vos.length).toBe(2);
      expect(vos[0].id).toBe(1);
      expect(vos[1].id).toBe(2);
    });

    it("应该支持空数组", () => {
      const vos: QueryConfigsVO = [];
      expect(Array.isArray(vos)).toBe(true);
      expect(vos.length).toBe(0);
    });
  });
});
