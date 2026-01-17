import type { Generated } from "kysely";
import type { ConfigModel, ToolModel } from "@jd-wmfe/honeycomb-common";

/**
 * 配置表类型定义
 * 使用 Generated<number> 表示自动生成的主键
 */
export interface ConfigsTable {
  id: Generated<number>;
  name: string;
  version: string;
  status: string;
  description: string;
  created_at: string;
  last_modified: string;
}

/**
 * 工具表类型定义
 * 使用 Generated<number> 表示自动生成的主键
 */
export interface ToolsTable {
  id: Generated<number>;
  config_id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  callback: string;
  created_at: string;
  last_modified: string;
}

/**
 * Kysely 数据库类型定义
 * 基于 @jd-wmfe/honeycomb-common 中的模型类型
 */
export interface Database {
  configs: ConfigsTable;
  tools: ToolsTable;
}

// 导出类型别名，与模型类型兼容
export type ConfigRow = ConfigModel;
export type ToolRow = ToolModel;
