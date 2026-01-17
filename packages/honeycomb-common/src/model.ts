/** 配置模型 */
export type ConfigModel = {
  id: number;
  name: string;
  version: string;
  status: string;
  description: string;
  created_at: string;
  last_modified: string;
};

/** 工具模型 */
export type ToolModel = {
  id: number;
  config_id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  callback: string;
  created_at: string;
  last_modified: string;
};
