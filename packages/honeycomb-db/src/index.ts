import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import initSqlJs, { Database } from "sql.js";
import { Kysely, Insertable, Selectable, Updateable } from "kysely";
import { SqlJsDialect } from "kysely-wasm";
import type { Database as KyselyDatabase, ConfigsTable, ToolsTable } from "./database.js";
import { getDatabasePath } from "./config.js";

export type { ConfigsTable, ToolsTable };

const dbPath = getDatabasePath();

/** 表名常量 */
const TABLES = {
  CONFIGS: "configs",
  TOOLS: "tools",
} as const;

export class DatabaseClient {
  private sqliteDb: Database | null = null;
  private kyselyDb: Kysely<KyselyDatabase> | null = null;

  /**
   * 获取已初始化的 Kysely 数据库实例
   * @throws {Error} 如果数据库未初始化
   */
  private get db(): Kysely<KyselyDatabase> {
    if (!this.kyselyDb) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.kyselyDb;
  }

  /**
   * 初始化数据库连接
   * @param initSchema 是否初始化表结构（默认 false，仅在数据库文件不存在时初始化）
   */
  async init(initSchema?: boolean): Promise<void> {
    if (this.kyselyDb) return;

    const SQL = await initSqlJs();
    const dbExists = existsSync(dbPath);

    if (dbExists) {
      const buffer = readFileSync(dbPath);
      this.sqliteDb = new SQL.Database(buffer);
    } else {
      this.sqliteDb = new SQL.Database();
      this.sqliteDb.run("PRAGMA foreign_keys = ON;");
    }

    // 创建 Kysely 实例
    this.kyselyDb = new Kysely<KyselyDatabase>({
      dialect: new SqlJsDialect({ database: this.sqliteDb }),
    });

    // 如果需要初始化表结构（测试环境或新数据库）
    if (initSchema || !dbExists) {
      await this._initSchema();
    }
  }

  /**
   * 初始化数据库表结构（内部方法）
   */
  private async _initSchema(): Promise<void> {
    if (!this.kyselyDb || !this.sqliteDb) return;

    // 检查表是否已存在
    const tables = this.sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='configs'");
    if (tables.length > 0 && tables[0].values.length > 0) {
      // 表已存在，跳过初始化
      return;
    }

    // 使用 Kysely schema builder 创建表结构
    await this.kyselyDb.schema
      .createTable("configs")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement().notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("version", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull())
      .addColumn("description", "text", (col) => col.notNull())
      .addColumn("created_at", "text", (col) => col.notNull())
      .addColumn("last_modified", "text", (col) => col.notNull())
      .execute();

    await this.kyselyDb.schema
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
        fk.onDelete("cascade"),
      )
      .execute();

    await this.kyselyDb.schema.createIndex("idx_tools_config_id").on("tools").column("config_id").execute();

    // 启用外键约束
    this.sqliteDb.run("PRAGMA foreign_keys = ON");
  }

  /**
   * 保存数据库到文件
   */
  async save(): Promise<void> {
    if (!this.sqliteDb) throw new Error("Database not initialized");
    writeFileSync(dbPath, Buffer.from(this.sqliteDb.export()));
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.kyselyDb) {
      await this.kyselyDb.destroy();
      this.kyselyDb = null;
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
  }

  // ==================== Config 操作 ====================

  /**
   * 创建配置
   */
  async createConfig(config: Insertable<ConfigsTable>): Promise<number> {
    const result = await this.db
      .insertInto(TABLES.CONFIGS)
      .values(config)
      .returning("id")
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create config");
    }

    return result.id;
  }

  /**
   * 根据 ID 查询配置
   */
  async getConfigById(id: number): Promise<Selectable<ConfigsTable> | null> {
    const result = await this.db
      .selectFrom(TABLES.CONFIGS)
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * 查询所有配置
   */
  async getAllConfigs(): Promise<Selectable<ConfigsTable>[]> {
    const results = await this.db.selectFrom(TABLES.CONFIGS).selectAll().orderBy("id").execute();

    return results;
  }

  /**
   * 更新配置
   */
  async updateConfig(id: number, config: Updateable<ConfigsTable>): Promise<boolean> {
    // 先检查配置是否存在
    const existing = await this.getConfigById(id);
    if (!existing) {
      return false;
    }

    await this.db
      .updateTable(TABLES.CONFIGS)
      .set(config)
      .where("id", "=", id)
      .execute();

    // 验证更新是否成功
    const updated = await this.getConfigById(id);
    return updated !== null;
  }

  /**
   * 删除配置（会级联删除关联的工具）
   */
  async deleteConfig(id: number): Promise<boolean> {
    // 先检查配置是否存在
    const existing = await this.getConfigById(id);
    if (!existing) {
      return false;
    }

    await this.db.deleteFrom(TABLES.CONFIGS).where("id", "=", id).execute();

    // 验证删除是否成功
    const deleted = await this.getConfigById(id);
    return deleted === null;
  }

  // ==================== Tool 操作 ====================

  /**
   * 创建工具
   */
  async createTool(tool: Insertable<ToolsTable>): Promise<number> {
    const result = await this.db
      .insertInto(TABLES.TOOLS)
      .values(tool)
      .returning("id")
      .executeTakeFirst();

    if (!result) {
      throw new Error("Failed to create tool");
    }

    return result.id;
  }

  /**
   * 根据 ID 查询工具
   */
  async getToolById(id: number): Promise<Selectable<ToolsTable> | null> {
    const result = await this.db
      .selectFrom(TABLES.TOOLS)
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * 根据配置 ID 查询所有工具
   */
  async getToolsByConfigId(configId: number): Promise<Selectable<ToolsTable>[]> {
    const results = await this.db
      .selectFrom(TABLES.TOOLS)
      .selectAll()
      .where("config_id", "=", configId)
      .orderBy("id")
      .execute();

    return results;
  }

  /**
   * 查询所有工具
   */
  async getAllTools(): Promise<Selectable<ToolsTable>[]> {
    const results = await this.db.selectFrom(TABLES.TOOLS).selectAll().orderBy("id").execute();

    return results;
  }

  /**
   * 更新工具
   */
  async updateTool(id: number, tool: Updateable<ToolsTable>): Promise<boolean> {
    const result = await this.db.updateTable(TABLES.TOOLS).set(tool).where("id", "=", id).execute();

    return result.length > 0;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: number): Promise<boolean> {
    const result = await this.db.deleteFrom(TABLES.TOOLS).where("id", "=", id).execute();

    return result.length > 0;
  }

  // ==================== 组合查询 ====================

  /**
   * 查询配置及其所有工具（使用 JOIN 优化）
   */
  async getConfigWithTools(
    id: number,
  ): Promise<(Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }) | null> {
    const config = await this.getConfigById(id);
    if (!config) return null;

    const tools = await this.getToolsByConfigId(id);
    return { ...config, tools };
  }

  /**
   * 查询所有配置及其工具（使用 JOIN 优化，避免 N+1 查询）
   */
  async getAllConfigsWithTools(): Promise<
    Array<Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }>
  > {
    // 一次性查询所有配置和工具，然后在内存中分组
    const [configs, tools] = await Promise.all([this.getAllConfigs(), this.getAllTools()]);

    // 按 config_id 分组工具
    const toolsByConfigId = new Map<number, Selectable<ToolsTable>[]>();
    for (const tool of tools) {
      const existing = toolsByConfigId.get(tool.config_id) || [];
      existing.push(tool);
      toolsByConfigId.set(tool.config_id, existing);
    }

    // 组合结果
    return configs.map((config) => ({
      ...config,
      tools: toolsByConfigId.get(config.id) || [],
    }));
  }

  // ==================== 事务支持 ====================

  /**
   * 在事务中执行操作
   * @param callback 事务回调函数，接收 Kysely 事务实例
   * @returns 事务回调函数的返回值
   */
  async transaction<T>(callback: (trx: Kysely<KyselyDatabase>) => Promise<T>): Promise<T> {
    return await this.db.transaction().execute(callback);
  }
}

// 导出单例实例
let clientInstance: DatabaseClient | null = null;

export async function getDatabaseClient(): Promise<DatabaseClient> {
  if (!clientInstance) {
    clientInstance = new DatabaseClient();
    await clientInstance.init();
  }
  return clientInstance;
}
