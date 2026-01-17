import { beforeAll, afterAll } from "vitest";
import { unlinkSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// 获取当前文件所在目录
const __dirname = dirname(fileURLToPath(import.meta.url));

// 测试用的数据库路径（使用临时文件，放在包目录下）
const TEST_DB_PATH = resolve(__dirname, "test.db");

// 清理测试数据库
beforeAll(() => {
  // 设置测试数据库路径
  process.env.DATABASE_PATH = TEST_DB_PATH;

  // 如果测试数据库已存在，先删除
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {
      // 忽略错误
    }
  }
});

afterAll(() => {
  // 清理测试数据库
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {
      // 忽略错误
    }
  }

  // 清理环境变量
  delete process.env.DATABASE_PATH;
});
