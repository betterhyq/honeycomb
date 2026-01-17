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
    'test-service',
    '1.0.0',
    'This is a test service configuration',
    now,
    now,
  ]);
  
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
    'test-tool',
    'This is a test tool',
    '{"message": {"type": "string", "description": "Test message"}}',
    '{"result": {"type": "string", "description": "Test result"}}',
    'async ({ message }) => { return { content: [{ type: "text", text: `Test: ${message}` }] }; }',
  ]);

  // 插入第二个测试配置（包含两个工具）
  insertConfig.run([
    'test-service-2',
    '2.0.0',
    'This is a second test service configuration',
    now,
    now,
  ]);
  
  // 获取第二个配置的 ID
  const configId2Result = db.exec('SELECT last_insert_rowid() as id');
  const configId2 = configId2Result[0]?.values[0]?.[0] as number;
  
  // 为第二个配置插入第一个工具
  insertTool.run([
    configId2,
    'test-tool-1',
    'This is the first tool for the second config',
    '{"query": {"type": "string", "description": "Query string"}}',
    '{"response": {"type": "string", "description": "Response string"}}',
    'async ({ query }) => { return { content: [{ type: "text", text: `Query: ${query}` }] }; }',
  ]);
  
  // 为第二个配置插入第二个工具
  insertTool.run([
    configId2,
    'test-tool-2',
    'This is the second tool for the second config',
    '{"data": {"type": "string", "description": "Data to process"}}',
    '{"processed": {"type": "string", "description": "Processed data"}}',
    'async ({ data }) => { return { content: [{ type: "text", text: `Processed: ${data}` }] }; }',
  ]);
  
  // 在所有使用完成后释放 prepared statements
  insertConfig.free();
  insertTool.free();

  writeFileSync(dbPath, Buffer.from(db.export()));
  consola.success(`数据库已创建: ${dbPath}`);
  consola.info(`已插入第一个测试配置 (ID: ${configId}) 和 1 个工具`);
  consola.info(`已插入第二个测试配置 (ID: ${configId2}) 和 2 个工具`);
} catch (error) {
  consola.error('数据库初始化失败:', error);
  process.exit(1);
}
