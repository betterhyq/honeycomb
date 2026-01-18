import "dotenv/config";
import { unlinkSync, writeFileSync } from "node:fs";
import consola from "consola";
import { Kysely } from "kysely";
import { SqlJsDialect } from "kysely-wasm";
import initSqlJs from "sql.js";
import { getDatabasePath } from "./config.js";
import type { Database } from "./database.js";

const dbPath = getDatabasePath();

try {
  unlinkSync(dbPath);
} catch {
  // 文件不存在，忽略
}

try {
  const SQL = await initSqlJs();
  const sqliteDb = new SQL.Database();

  // 创建 Kysely 实例
  const db = new Kysely<Database>({
    dialect: new SqlJsDialect({ database: sqliteDb }),
  });

  // 使用 Kysely schema builder 创建表结构
  await db.schema
    .createTable("configs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("version", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("last_modified", "text", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("tools")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn("config_id", "integer", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("input_schema", "text", (col) => col.notNull())
    .addColumn("output_schema", "text", (col) => col.notNull())
    .addColumn("callback", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("last_modified", "text", (col) => col.notNull())
    .addForeignKeyConstraint("fk_tools_config", ["config_id"], "configs", ["id"], (fk) =>
      fk.onDelete("cascade")
    )
    .execute();

  await db.schema.createIndex("idx_tools_config_id").on("tools").column("config_id").execute();

  // 启用外键约束（直接在 sql.js Database 上执行）
  sqliteDb.run("PRAGMA foreign_keys = ON");

  // 插入测试数据
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  // 使用 Kysely 插入数据（类型安全）
  const config1 = await db
    .insertInto("configs")
    .values({
      name: "test-service",
      version: "1.0.0",
      status: "running",
      description: "This is a test service configuration",
      created_at: now,
      last_modified: now,
    })
    .returning("id")
    .executeTakeFirst();

  const configId = config1?.id;
  if (!configId) {
    throw new Error("Failed to insert config");
  }

  await db
    .insertInto("tools")
    .values({
      config_id: configId,
      name: "test-tool",
      description: "This is a test tool",
      input_schema: '{"message": {"type": "string", "description": "Test message"}}',
      output_schema: '{"result": {"type": "string", "description": "Test result"}}',
      callback:
        'async ({ message }) => { return { content: [{ type: "text", text: `Test: ${message}` }] }; }',
      created_at: now,
      last_modified: now,
    })
    .execute();

  // 插入第二个测试配置（包含两个工具）
  const config2 = await db
    .insertInto("configs")
    .values({
      name: "test-service-2",
      version: "2.0.0",
      status: "stopped",
      description: "This is a second test service configuration",
      created_at: now,
      last_modified: now,
    })
    .returning("id")
    .executeTakeFirst();

  const configId2 = config2?.id;
  if (!configId2) {
    throw new Error("Failed to insert second config");
  }

  // 为第二个配置插入第一个工具
  await db
    .insertInto("tools")
    .values({
      config_id: configId2,
      name: "test-tool-1",
      description: "This is the first tool for the second config",
      input_schema: '{"query": {"type": "string", "description": "Query string"}}',
      output_schema: '{"response": {"type": "string", "description": "Response string"}}',
      callback:
        'async ({ query }) => { return { content: [{ type: "text", text: `Query: ${query}` }] }; }',
      created_at: now,
      last_modified: now,
    })
    .execute();

  // 为第二个配置插入第二个工具
  await db
    .insertInto("tools")
    .values({
      config_id: configId2,
      name: "test-tool-2",
      description: "This is the second tool for the second config",
      input_schema: '{"data": {"type": "string", "description": "Data to process"}}',
      output_schema: '{"processed": {"type": "string", "description": "Processed data"}}',
      callback:
        'async ({ data }) => { return { content: [{ type: "text", text: `Processed: ${data}` }] }; }',
      created_at: now,
      last_modified: now,
    })
    .execute();

  // 导出数据库到文件
  writeFileSync(dbPath, Buffer.from(sqliteDb.export()));

  // 关闭连接
  await db.destroy();
  consola.success(`数据库已创建: ${dbPath}`);
  consola.info(`已插入第一个测试配置 (ID: ${configId}) 和 1 个工具`);
  consola.info(`已插入第二个测试配置 (ID: ${configId2}) 和 2 个工具`);
} catch (error) {
  consola.error("数据库初始化失败:", error);
  process.exit(1);
}
