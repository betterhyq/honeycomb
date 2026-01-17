import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { Database } from 'sql.js';
import { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import { SqlJsDialect } from 'kysely-wasm';
import type { Database as KyselyDatabase, ConfigsTable, ToolsTable } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../mcp.db');

/** 表名常量 */
const TABLES = {
  CONFIGS: 'configs',
  TOOLS: 'tools',
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
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.kyselyDb;
  }

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.kyselyDb) return;

    const SQL = await initSqlJs();

    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      this.sqliteDb = new SQL.Database(buffer);
    } else {
      this.sqliteDb = new SQL.Database();
      this.sqliteDb.run('PRAGMA foreign_keys = ON;');
    }

    // 创建 Kysely 实例
    this.kyselyDb = new Kysely<KyselyDatabase>({
      dialect: new SqlJsDialect({ database: this.sqliteDb }),
    });
  }

  /**
   * 保存数据库到文件
   */
  async save(): Promise<void> {
    if (!this.sqliteDb) throw new Error('Database not initialized');
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
      .returning('id')
      .executeTakeFirst();
    
    if (!result) {
      throw new Error('Failed to create config');
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
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result || null;
  }

  /**
   * 查询所有配置
   */
  async getAllConfigs(): Promise<Selectable<ConfigsTable>[]> {
    const results = await this.db
      .selectFrom(TABLES.CONFIGS)
      .selectAll()
      .orderBy('id')
      .execute();
    
    return results;
  }

  /**
   * 更新配置
   */
  async updateConfig(id: number, config: Updateable<ConfigsTable>): Promise<boolean> {
    const result = await this.db
      .updateTable(TABLES.CONFIGS)
      .set(config)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  /**
   * 删除配置（会级联删除关联的工具）
   */
  async deleteConfig(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom(TABLES.CONFIGS)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  // ==================== Tool 操作 ====================

  /**
   * 创建工具
   */
  async createTool(tool: Insertable<ToolsTable>): Promise<number> {
    const result = await this.db
      .insertInto(TABLES.TOOLS)
      .values(tool)
      .returning('id')
      .executeTakeFirst();
    
    if (!result) {
      throw new Error('Failed to create tool');
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
      .where('id', '=', id)
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
      .where('config_id', '=', configId)
      .orderBy('id')
      .execute();
    
    return results;
  }

  /**
   * 查询所有工具
   */
  async getAllTools(): Promise<Selectable<ToolsTable>[]> {
    const results = await this.db
      .selectFrom(TABLES.TOOLS)
      .selectAll()
      .orderBy('id')
      .execute();
    
    return results;
  }

  /**
   * 更新工具
   */
  async updateTool(id: number, tool: Updateable<ToolsTable>): Promise<boolean> {
    const result = await this.db
      .updateTable(TABLES.TOOLS)
      .set(tool)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom(TABLES.TOOLS)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  // ==================== 组合查询 ====================

  /**
   * 查询配置及其所有工具（使用 JOIN 优化）
   */
  async getConfigWithTools(id: number): Promise<(Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }) | null> {
    const config = await this.getConfigById(id);
    if (!config) return null;
    
    const tools = await this.getToolsByConfigId(id);
    return { ...config, tools };
  }

  /**
   * 查询所有配置及其工具（使用 JOIN 优化，避免 N+1 查询）
   */
  async getAllConfigsWithTools(): Promise<Array<Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }>> {
    // 一次性查询所有配置和工具，然后在内存中分组
    const [configs, tools] = await Promise.all([
      this.getAllConfigs(),
      this.getAllTools(),
    ]);

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
