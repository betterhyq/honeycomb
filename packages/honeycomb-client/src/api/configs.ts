import { get, post, put, del, type ApiResponse } from "../request";
import type {
  QueryConfigsVO,
  QueryConfigVO,
  CreateConfigDTO,
  UpdateConfigDTO,
} from "@jd-wmfe/honeycomb-common";
import { ApiEnum } from "@jd-wmfe/honeycomb-common";
import { replaceUrlParams } from "../utils/url";

/**
 * 获取所有配置（带工具）
 */
export async function getConfigs(): Promise<ApiResponse<QueryConfigsVO>> {
  return get<QueryConfigsVO>(ApiEnum.QUERY_CONFIGS);
}

/**
 * 获取单个配置（带工具）
 */
export async function getConfigById(id: number): Promise<ApiResponse<QueryConfigVO>> {
  const url = replaceUrlParams(ApiEnum.QUERY_CONFIG, { id });
  return get<QueryConfigVO>(url);
}

/**
 * 创建配置
 */
export async function createConfig(config: CreateConfigDTO): Promise<ApiResponse<QueryConfigVO>> {
  return post<QueryConfigVO>(ApiEnum.CREATE_CONFIG, config);
}

/**
 * 更新配置
 */
export async function updateConfig(
  id: number,
  config: Omit<UpdateConfigDTO, "id">,
): Promise<ApiResponse<QueryConfigVO>> {
  const url = replaceUrlParams(ApiEnum.UPDATE_CONFIG, { id });
  const dto: UpdateConfigDTO = {
    id,
    ...config,
  };
  return put<QueryConfigVO>(url, dto);
}

/**
 * 删除配置
 */
export async function deleteConfig(id: number): Promise<ApiResponse<null>> {
  const url = replaceUrlParams(ApiEnum.DELETE_CONFIG, { id });
  return del<null>(url);
}

/**
 * 启动服务
 */
export async function startConfig(id: number): Promise<ApiResponse<QueryConfigVO>> {
  const url = replaceUrlParams(ApiEnum.START_CONFIG, { id });
  return post<QueryConfigVO>(url);
}

/**
 * 停止服务
 */
export async function stopConfig(id: number): Promise<ApiResponse<QueryConfigVO>> {
  const url = replaceUrlParams(ApiEnum.STOP_CONFIG, { id });
  return post<QueryConfigVO>(url);
}

// 导出类型别名，方便组件使用
export type { QueryConfigVO as ServiceConfig, QueryConfigsVO };
