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
      status TEXT NOT NULL,
      status_text TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_configs_status ON configs(status);
  `);

  writeFileSync(dbPath, Buffer.from(db.export()));
  consola.success(`数据库已创建: ${dbPath}`);
} catch (error) {
  consola.error('数据库初始化失败:', error);
  process.exit(1);
}
