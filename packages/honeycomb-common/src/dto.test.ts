import { describe, it, expect } from "vitest";
import type {
  QueryConfigDTO,
  CreateConfigDTO,
  UpdateConfigDTO,
  DeleteConfigDTO,
  StartConfigDTO,
  StopConfigDTO,
} from "./dto";

describe("DTO 类型验证", () => {
  describe("QueryConfigDTO", () => {
    it("应该包含 id 字段", () => {
      const dto: QueryConfigDTO = { id: 1 };
      expect(dto.id).toBe(1);
      expect(typeof dto.id).toBe("number");
    });

    it("id 应该是正数", () => {
      const dto: QueryConfigDTO = { id: 123 };
      expect(dto.id).toBeGreaterThan(0);
    });
  });

  describe("CreateConfigDTO", () => {
    it("应该包含所有必填字段", () => {
      const dto: CreateConfigDTO = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
        tools: [],
      };
      expect(dto.name).toBe("test-service");
      expect(dto.version).toBe("1.0.0");
      expect(dto.description).toBe("Test description");
      expect(Array.isArray(dto.tools)).toBe(true);
    });

    it("应该支持工具数组", () => {
      const dto: CreateConfigDTO = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
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
      expect(dto.tools.length).toBe(1);
      expect(dto.tools[0].name).toBe("test-tool");
      expect(dto.tools[0].description).toBe("Tool description");
      expect(dto.tools[0].input_schema).toBe('{"type": "object"}');
      expect(dto.tools[0].output_schema).toBe('{"type": "object"}');
      expect(dto.tools[0].callback).toBe("async () => {}");
    });

    it("应该支持多个工具", () => {
      const dto: CreateConfigDTO = {
        name: "test-service",
        version: "1.0.0",
        description: "Test description",
        tools: [
          {
            name: "tool-1",
            description: "Tool 1",
            input_schema: "{}",
            output_schema: "{}",
            callback: "async () => {}",
          },
          {
            name: "tool-2",
            description: "Tool 2",
            input_schema: "{}",
            output_schema: "{}",
            callback: "async () => {}",
          },
        ],
      };
      expect(dto.tools.length).toBe(2);
    });
  });

  describe("UpdateConfigDTO", () => {
    it("应该包含 id 和可更新字段", () => {
      const dto: UpdateConfigDTO = {
        id: 1,
        name: "updated-service",
        version: "2.0.0",
        description: "Updated description",
        tools: [],
      };
      expect(dto.id).toBe(1);
      expect(dto.name).toBe("updated-service");
      expect(dto.version).toBe("2.0.0");
      expect(dto.description).toBe("Updated description");
    });

    it("应该支持更新工具列表", () => {
      const dto: UpdateConfigDTO = {
        id: 1,
        name: "updated-service",
        version: "2.0.0",
        description: "Updated description",
        tools: [
          {
            name: "new-tool",
            description: "New tool",
            input_schema: "{}",
            output_schema: "{}",
            callback: "async () => {}",
          },
        ],
      };
      expect(dto.tools.length).toBe(1);
    });
  });

  describe("DeleteConfigDTO", () => {
    it("应该包含 id 字段", () => {
      const dto: DeleteConfigDTO = { id: 1 };
      expect(dto.id).toBe(1);
    });
  });

  describe("StartConfigDTO", () => {
    it("应该包含 id 字段", () => {
      const dto: StartConfigDTO = { id: 1 };
      expect(dto.id).toBe(1);
    });
  });

  describe("StopConfigDTO", () => {
    it("应该包含 id 字段", () => {
      const dto: StopConfigDTO = { id: 1 };
      expect(dto.id).toBe(1);
    });
  });
});
