import "dotenv/config";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * 获取数据库文件路径
 * 优先使用环境变量 DATABASE_PATH，如果未设置则使用默认的相对路径
 */
export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    // 如果路径是绝对路径，直接使用；否则相对于项目根目录
    return process.env.DATABASE_PATH.startsWith("/")
      ? process.env.DATABASE_PATH
      : resolve(process.cwd(), process.env.DATABASE_PATH);
  }
  // 默认路径：相对于当前文件位置
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, "../mcp.db");
}
