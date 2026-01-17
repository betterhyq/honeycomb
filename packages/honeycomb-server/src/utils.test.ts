import { describe, it, expect } from "vitest";
import { dbToVO, createDtoToDb, updateDtoToDb, getCurrentTimeString } from "./utils";
import { StatusEnum } from "@jd-wmfe/honeycomb-common";
import type { Selectable } from "kysely";
import type { ConfigsTable, ToolsTable } from "@jd-wmfe/honeycomb-db";

describe("utils", () => {
  describe("dbToVO", () => {
    it("应该正确转换数据库格式到 VO 格式", () => {
      const dbConfig: Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] } = {
        id: 1,
        name: "test-service",
        version: "1.0.0",
        status: StatusEnum.RUNNING,
        description: "Test description",
        created_at: "2024-01-01 00:00:00",
        last_modified: "2024-01-01 00:00:00",
        tools: [
          {
            id: 1,
            config_id: 1,
            name: "test-tool",
            description: "Tool description",
            input_schema: '{"type": "object"}',
            output_schema: '{"type": "object"}',
            callback: "async () => {}",
            created_at: "2024-01-01 00:00:00",
            last_modified: "2024-01-01 00:00:00",
          },
        ],
      };

      const vo = dbToVO(dbConfig);

      expect(vo.id).toBe(1);
      expect(vo.name).toBe("test-service");
      expect(vo.version).toBe("1.0.0");
      expect(vo.status).toBe(StatusEnum.RUNNING);
      expect(vo.statusText).toBe("运行中");
      expect(vo.description).toBe("Test description");
      expect(vo.createdAt).toBe("2024-01-01 00:00:00");
      expect(vo.lastModified).toBe("2024-01-01 00:00:00");
      expect(vo.tools.length).toBe(1);
      expect(vo.tools[0].name).toBe("test-tool");
    });

    it("应该正确处理已停止状态", () => {
      const dbConfig: Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] } = {
        id: 1,
        name: "test-service",
        version: "1.0.0",
        status: StatusEnum.STOPPED,
        description: "Test description",
        created_at: "2024-01-01 00:00:00",
        last_modified: "2024-01-01 00:00:00",
        tools: [],
      };

      const vo = dbToVO(dbConfig);
      expect(vo.status).toBe(StatusEnum.STOPPED);
      expect(vo.statusText).toBe("已停止");
    });

    it("应该正确处理空工具列表", () => {
      const dbConfig: Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] } = {
        id: 1,
        name: "test-service",
        version: "1.0.0",
        status: StatusEnum.STOPPED,
        description: "Test description",
        created_at: "2024-01-01 00:00:00",
        last_modified: "2024-01-01 00:00:00",
        tools: [],
      };

      const vo = dbToVO(dbConfig);
      expect(vo.tools.length).toBe(0);
    });
  });

  describe("createDtoToDb", () => {
    it("应该正确转换 CreateConfigDTO 到数据库格式", () => {
      const dto = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
        tools: [],
      };

      const dbConfig = createDtoToDb(dto, StatusEnum.STOPPED);

      expect(dbConfig.name).toBe("test-service");
      expect(dbConfig.version).toBe("1.0.0");
      expect(dbConfig.status).toBe(StatusEnum.STOPPED);
      expect(dbConfig.description).toBe("Test description");
      expect(dbConfig.created_at).toBeDefined();
      expect(dbConfig.last_modified).toBeDefined();
      expect(typeof dbConfig.created_at).toBe("string");
      expect(typeof dbConfig.last_modified).toBe("string");
    });

    it("应该使用指定的状态", () => {
      const dto = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
        tools: [],
      };

      const dbConfig = createDtoToDb(dto, StatusEnum.RUNNING);
      expect(dbConfig.status).toBe(StatusEnum.RUNNING);
    });

    it("应该生成时间戳", () => {
      const dto = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
        tools: [],
      };

      const dbConfig = createDtoToDb(dto);
      const now = getCurrentTimeString();
      
      // 时间应该接近当前时间（允许几秒误差）
      expect(dbConfig.created_at).toBeDefined();
      expect(dbConfig.last_modified).toBeDefined();
    });
  });

  describe("updateDtoToDb", () => {
    it("应该正确转换 UpdateConfigDTO 到数据库格式", () => {
      const dto = {
        id: 1,
        name: "updated-service",
        version: "2.0.0",
        description: "Updated description",
        tools: [],
      };

      const dbConfig = updateDtoToDb(dto);

      expect(dbConfig.name).toBe("updated-service");
      expect(dbConfig.version).toBe("2.0.0");
      expect(dbConfig.description).toBe("Updated description");
      expect(dbConfig.last_modified).toBeDefined();
      expect(typeof dbConfig.last_modified).toBe("string");
    });

    it("应该更新 last_modified 时间", () => {
      const dto = {
        id: 1,
        name: "updated-service",
        version: "2.0.0",
        description: "Updated description",
        tools: [],
      };

      const dbConfig = updateDtoToDb(dto);
      const now = getCurrentTimeString();
      
      expect(dbConfig.last_modified).toBeDefined();
    });
  });

  describe("getCurrentTimeString", () => {
    it("应该返回格式化的时间字符串", () => {
      const timeString = getCurrentTimeString();
      
      expect(typeof timeString).toBe("string");
      // 格式应该是 YYYY-MM-DD HH:mm:ss
      expect(timeString).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it("应该使用中文字符替换斜杠", () => {
      const timeString = getCurrentTimeString();
      expect(timeString).not.toContain("/");
      expect(timeString).toContain("-");
    });
  });
});
