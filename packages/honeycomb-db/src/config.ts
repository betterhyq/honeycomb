import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { consola } from "consola";
import dotenv from "dotenv";

// 缓存根路径和数据库路径，避免重复计算
let cachedRootPath: string | null = null;
let cachedDatabasePath: string | null = null;
let envLoaded = false;

/**
 * 获取项目根路径
 * 从当前文件位置向上查找 4 级目录（从 src/config.ts 到项目根目录）
 */
function getRootPath(): string {
  if (cachedRootPath) {
    return cachedRootPath;
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  cachedRootPath = resolve(__dirname, "../../../..");
  return cachedRootPath;
}

/**
 * 加载环境变量（仅加载一次）
 */
function loadEnvIfNeeded(): void {
  if (envLoaded) {
    return;
  }

  const rootPath = getRootPath();
  const envPath = resolve(rootPath, ".env");

  try {
    dotenv.config({ path: envPath });
    envLoaded = true;
    consola.debug(`[Database] 已加载环境变量文件: ${envPath}`);
  } catch (error) {
    consola.warn(`[Database] 无法加载环境变量文件 ${envPath}:`, error);
    // 即使加载失败也标记为已加载，避免重复尝试
    envLoaded = true;
  }
}

/**
 * 获取数据库文件路径
 * 优先使用环境变量 DATABASE_PATH，如果未设置则使用默认的相对路径 "mcp.db"
 *
 * @returns 数据库文件的绝对路径
 */
export function getDatabasePath(): string {
  // 如果已缓存，直接返回
  if (cachedDatabasePath) {
    return cachedDatabasePath;
  }

  // 加载环境变量
  loadEnvIfNeeded();

  const rootPath = getRootPath();
  const databasePath = process.env.DATABASE_PATH || "mcp.db";

  // 如果 DATABASE_PATH 是绝对路径，直接使用；否则相对于根路径
  const absolutePath = databasePath.startsWith("/")
    ? databasePath
    : resolve(rootPath, databasePath);

  cachedDatabasePath = absolutePath;

  consola.info(`[Database] 数据库路径: ${absolutePath}`);
  if (process.env.DATABASE_PATH) {
    consola.debug(`[Database] 使用环境变量 DATABASE_PATH: ${process.env.DATABASE_PATH}`);
  } else {
    consola.debug(`[Database] 使用默认路径: mcp.db`);
  }

  return absolutePath;
}
