import type { CreateConfigDTO, QueryConfigVO, UpdateConfigDTO } from "@jd-wmfe/honeycomb-common";
import { StatusEnum, StatusTextMap } from "@jd-wmfe/honeycomb-common";
import type { ConfigsTable, ToolsTable } from "@jd-wmfe/honeycomb-db";
import type { Selectable } from "kysely";

// 数据库配置类型（包含工具列表）
export type ConfigWithTools = Selectable<ConfigsTable> & {
  tools: Selectable<ToolsTable>[];
};

/**
 * 将数据库格式转换为 VO 格式
 */
export function dbToVO(dbConfig: ConfigWithTools): QueryConfigVO {
  const status = dbConfig.status as StatusEnum;
  const statusText = StatusTextMap.get(status) || dbConfig.status;

  return {
    id: dbConfig.id,
    name: dbConfig.name,
    version: dbConfig.version,
    status: status,
    statusText: statusText,
    description: dbConfig.description,
    createdAt: dbConfig.created_at,
    lastModified: dbConfig.last_modified,
    tools: dbConfig.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
      output_schema: tool.output_schema,
      callback: tool.callback,
    })),
  };
}

/**
 * 将 CreateConfigDTO 转换为数据库格式
 */
export function createDtoToDb(
  dto: CreateConfigDTO,
  status: StatusEnum = StatusEnum.STOPPED
): Omit<Selectable<ConfigsTable>, "id"> {
  const now = getCurrentTimeString();

  return {
    name: dto.name,
    version: dto.version,
    status: status,
    description: dto.description,
    created_at: now,
    last_modified: now,
  };
}

/**
 * 将 UpdateConfigDTO 转换为数据库格式
 */
export function updateDtoToDb(dto: UpdateConfigDTO): Partial<Selectable<ConfigsTable>> {
  const dbConfig: Partial<Selectable<ConfigsTable>> = {
    name: dto.name,
    version: dto.version,
    description: dto.description,
    last_modified: getCurrentTimeString(),
  };

  return dbConfig;
}

/**
 * 获取当前时间字符串
 */
export function getCurrentTimeString(): string {
  return new Date()
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "-");
}
