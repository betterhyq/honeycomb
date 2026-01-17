import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { Database } from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../mcp.db');

export interface ConfigRecord {
  id?: number;
  name: string;
  version: string;
  status: string;
  status_text: string;
  description: string;
  created_at: string;
  last_modified: string;
}

export interface ToolRecord {
  id?: number;
  config_id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  callback: string;
}

export class DatabaseClient {
  private db: Database | null = null;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.db) return;

    const SQL = await initSqlJs();

    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.db.run('PRAGMA foreign_keys = ON;');
    }
  }

  /**
   * 保存数据库到文件
   */
  async save(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    writeFileSync(dbPath, Buffer.from(this.db.export()));
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================== Config 操作 ====================

  /**
   * 创建配置
   */
  async createConfig(config: Omit<ConfigRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO configs (name, version, status, status_text, description, created_at, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      config.name,
      config.version,
      config.status,
      config.status_text,
      config.description,
      config.created_at,
      config.last_modified,
    ]);
    
    stmt.free();
    
    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number;
  }

  /**
   * 根据 ID 查询配置
   */
  async getConfigById(id: number): Promise<ConfigRecord | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM configs WHERE id = ?');
    stmt.bind([id]);
    
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    
    return {
      id: row.id as number,
      name: row.name as string,
      version: row.version as string,
      status: row.status as string,
      status_text: row.status_text as string,
      description: row.description as string,
      created_at: row.created_at as string,
      last_modified: row.last_modified as string,
    };
  }

  /**
   * 查询所有配置
   */
  async getAllConfigs(): Promise<ConfigRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec('SELECT * FROM configs ORDER BY id');
    if (!result[0]) return [];
    
    return result[0].values.map(row => ({
      id: row[0] as number,
      name: row[1] as string,
      version: row[2] as string,
      status: row[3] as string,
      status_text: row[4] as string,
      description: row[5] as string,
      created_at: row[6] as string,
      last_modified: row[7] as string,
    }));
  }

  /**
   * 更新配置
   */
  async updateConfig(id: number, config: Partial<Omit<ConfigRecord, 'id'>>): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const sql = `UPDATE configs SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(values);
    stmt.free();
    
    return true;
  }

  /**
   * 删除配置（会级联删除关联的工具）
   */
  async deleteConfig(id: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('DELETE FROM configs WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return true;
  }

  // ==================== Tool 操作 ====================

  /**
   * 创建工具
   */
  async createTool(tool: Omit<ToolRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      INSERT INTO tools (config_id, name, description, input_schema, output_schema, callback)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      tool.config_id,
      tool.name,
      tool.description,
      tool.input_schema,
      tool.output_schema,
      tool.callback,
    ]);
    
    stmt.free();
    
    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number;
  }

  /**
   * 根据 ID 查询工具
   */
  async getToolById(id: number): Promise<ToolRecord | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM tools WHERE id = ?');
    stmt.bind([id]);
    
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    
    const row = stmt.getAsObject();
    stmt.free();
    
    return {
      id: row.id as number,
      config_id: row.config_id as number,
      name: row.name as string,
      description: row.description as string,
      input_schema: row.input_schema as string,
      output_schema: row.output_schema as string,
      callback: row.callback as string,
    };
  }

  /**
   * 根据配置 ID 查询所有工具
   */
  async getToolsByConfigId(configId: number): Promise<ToolRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM tools WHERE config_id = ? ORDER BY id');
    stmt.bind([configId]);
    
    const tools: ToolRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tools.push({
        id: row.id as number,
        config_id: row.config_id as number,
        name: row.name as string,
        description: row.description as string,
        input_schema: row.input_schema as string,
        output_schema: row.output_schema as string,
        callback: row.callback as string,
      });
    }
    
    stmt.free();
    return tools;
  }

  /**
   * 查询所有工具
   */
  async getAllTools(): Promise<ToolRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec('SELECT * FROM tools ORDER BY id');
    if (!result[0]) return [];
    
    return result[0].values.map(row => ({
      id: row[0] as number,
      config_id: row[1] as number,
      name: row[2] as string,
      description: row[3] as string,
      input_schema: row[4] as string,
      output_schema: row[5] as string,
      callback: row[6] as string,
    }));
  }

  /**
   * 更新工具
   */
  async updateTool(id: number, tool: Partial<Omit<ToolRecord, 'id'>>): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(tool).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const sql = `UPDATE tools SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(values);
    stmt.free();
    
    return true;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('DELETE FROM tools WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return true;
  }

  // ==================== 组合查询 ====================

  /**
   * 查询配置及其所有工具
   */
  async getConfigWithTools(id: number): Promise<(ConfigRecord & { tools: ToolRecord[] }) | null> {
    const config = await this.getConfigById(id);
    if (!config) return null;
    
    const tools = await this.getToolsByConfigId(id);
    return { ...config, tools };
  }

  /**
   * 查询所有配置及其工具
   */
  async getAllConfigsWithTools(): Promise<Array<ConfigRecord & { tools: ToolRecord[] }>> {
    const configs = await this.getAllConfigs();
    return Promise.all(
      configs.map(async (config) => {
        const tools = await this.getToolsByConfigId(config.id!);
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
