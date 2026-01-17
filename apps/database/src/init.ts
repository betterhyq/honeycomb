import consola from 'consola';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), '../mcp.db');

try {
  unlinkSync(dbPath);
} catch {
  // 文件不存在，忽略
}

try {
  const db = new (await initSqlJs()).Database();

  db.run('PRAGMA foreign_keys = ON;');
  db.run(`
    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_modified TEXT NOT NULL,
      UNIQUE(id)
    );
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      input_schema TEXT NOT NULL,
      output_schema TEXT NOT NULL,
      callback TEXT NOT NULL,
      FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE,
      UNIQUE(id)
    );
    CREATE INDEX IF NOT EXISTS idx_tools_config_id ON tools(config_id);
  `);

  // 插入测试数据
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  const insertConfig = db.prepare(`
    INSERT INTO configs (name, version, description, created_at, last_modified)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertConfig.run([
    '测试服务',
    '1.0.0',
    '这是一个测试服务配置',
    now,
    now,
  ]);
  insertConfig.free();
  
  // 获取刚插入的配置 ID
  const configIdResult = db.exec('SELECT last_insert_rowid() as id');
  const configId = configIdResult[0]?.values[0]?.[0] as number;
  
  // 插入测试工具
  const insertTool = db.prepare(`
    INSERT INTO tools (config_id, name, description, input_schema, output_schema, callback)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertTool.run([
    configId,
    '测试工具',
    '这是一个测试工具',
    '{message: z.string().describe("测试消息")}',
    '{result: z.string().describe("测试结果")}',
    'async ({ message }) => { return { content: [{ type: "text", text: `测试: ${message}` }] }; }',
  ]);
  insertTool.free();

  writeFileSync(dbPath, Buffer.from(db.export()));
  consola.success(`数据库已创建: ${dbPath}`);
  consola.info(`已插入测试配置 (ID: ${configId}) 和测试工具`);
} catch (error) {
  consola.error('数据库初始化失败:', error);
  process.exit(1);
}
