// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://0.0.0.0:3002";

// 响应类型定义
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// HTTP 请求配置
interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * 处理 URL 参数
 */
function buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * 通用 HTTP 请求函数
 */
export async function request<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;

  // 构建完整 URL
  const fullUrl = buildUrl(`${API_BASE_URL}${url}`, params);

  // 设置默认 headers
  const headers = new Headers({
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  });

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });

    // 处理响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        code: response.status,
        msg: response.statusText,
        data: null,
      }));
      throw new Error(errorData.msg || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // 网络错误或其他错误
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("请求失败，请稍后重试");
  }
}

/**
 * GET 请求
 */
export function get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "GET",
    params,
  });
}

/**
 * POST 请求
 */
export function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT 请求
 */
export function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE 请求
 */
export function del<T = any>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "DELETE",
  });
}
