import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { Database } from 'sql.js';
import { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import { SqlJsDialect } from 'kysely-wasm';
import type { Database as KyselyDatabase, ConfigsTable, ToolsTable } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../mcp.db');

export class DatabaseClient {
  private sqliteDb: Database | null = null;
  private kyselyDb: Kysely<KyselyDatabase> | null = null;

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
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .insertInto('configs')
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
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .selectFrom('configs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result || null;
  }

  /**
   * 查询所有配置
   */
  async getAllConfigs(): Promise<Selectable<ConfigsTable>[]> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const results = await this.kyselyDb
      .selectFrom('configs')
      .selectAll()
      .orderBy('id')
      .execute();
    
    return results;
  }

  /**
   * 更新配置
   */
  async updateConfig(id: number, config: Updateable<ConfigsTable>): Promise<boolean> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .updateTable('configs')
      .set(config)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  /**
   * 删除配置（会级联删除关联的工具）
   */
  async deleteConfig(id: number): Promise<boolean> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .deleteFrom('configs')
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  // ==================== Tool 操作 ====================

  /**
   * 创建工具
   */
  async createTool(tool: Insertable<ToolsTable>): Promise<number> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .insertInto('tools')
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
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .selectFrom('tools')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result || null;
  }

  /**
   * 根据配置 ID 查询所有工具
   */
  async getToolsByConfigId(configId: number): Promise<Selectable<ToolsTable>[]> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const results = await this.kyselyDb
      .selectFrom('tools')
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
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const results = await this.kyselyDb
      .selectFrom('tools')
      .selectAll()
      .orderBy('id')
      .execute();
    
    return results;
  }

  /**
   * 更新工具
   */
  async updateTool(id: number, tool: Updateable<ToolsTable>): Promise<boolean> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .updateTable('tools')
      .set(tool)
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: number): Promise<boolean> {
    if (!this.kyselyDb) throw new Error('Database not initialized');
    
    const result = await this.kyselyDb
      .deleteFrom('tools')
      .where('id', '=', id)
      .execute();
    
    return result.length > 0;
  }

  // ==================== 组合查询 ====================

  /**
   * 查询配置及其所有工具
   */
  async getConfigWithTools(id: number): Promise<(Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }) | null> {
    const config = await this.getConfigById(id);
    if (!config) return null;
    
    const tools = await this.getToolsByConfigId(id);
    return { ...config, tools };
  }

  /**
   * 查询所有配置及其工具
   */
  async getAllConfigsWithTools(): Promise<Array<Selectable<ConfigsTable> & { tools: Selectable<ToolsTable>[] }>> {
    const configs = await this.getAllConfigs();
    return Promise.all(
      configs.map(async (config) => {
        const tools = await this.getToolsByConfigId(config.id);
        return { ...config, tools };
      })
    );
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
