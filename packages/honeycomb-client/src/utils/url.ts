/**
 * 替换 URL 中的参数
 * @param url - 包含参数的 URL，如 '/api/config/:id'
 * @param params - 参数对象，如 { id: 123 }
 * @returns 替换后的 URL
 */
export function replaceUrlParams(url: string, params: Record<string, string | number>): string {
  let result = url;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value));
  }
  return result;
}
