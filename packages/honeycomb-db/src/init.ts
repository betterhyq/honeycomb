import "dotenv/config";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
		.addColumn("id", "integer", (col) =>
			col.primaryKey().autoIncrement().notNull(),
		)
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("version", "text", (col) => col.notNull())
		.addColumn("status", "text", (col) => col.notNull())
		.addColumn("description", "text", (col) => col.notNull())
		.addColumn("created_at", "text", (col) => col.notNull())
		.addColumn("last_modified", "text", (col) => col.notNull())
		.execute();

	await db.schema
		.createTable("tools")
		.addColumn("id", "integer", (col) =>
			col.primaryKey().autoIncrement().notNull(),
		)
		.addColumn("config_id", "integer", (col) => col.notNull())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("description", "text", (col) => col.notNull())
		.addColumn("input_schema", "text", (col) => col.notNull())
		.addColumn("output_schema", "text", (col) => col.notNull())
		.addColumn("callback", "text", (col) => col.notNull())
		.addColumn("created_at", "text", (col) => col.notNull())
		.addColumn("last_modified", "text", (col) => col.notNull())
		.addForeignKeyConstraint(
			"fk_tools_config",
			["config_id"],
			"configs",
			["id"],
			(fk) => fk.onDelete("cascade"),
		)
		.execute();

	await db.schema
		.createIndex("idx_tools_config_id")
		.on("tools")
		.column("config_id")
		.execute();

	// 启用外键约束（直接在 sql.js Database 上执行）
	sqliteDb.run("PRAGMA foreign_keys = ON");

	// 从JSON文件加载初始化数据
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const initDataPath = resolve(__dirname, "init-data.json");
	const initData = JSON.parse(readFileSync(initDataPath, "utf-8")) as {
		configs: Array<{
			name: string;
			version: string;
			status: string;
			description: string;
			tools?: Array<{
				name: string;
				description: string;
				input_schema: string;
				output_schema: string;
				callback: string;
			}>;
		}>;
	};

	if (!initData.configs || initData.configs.length !== 23) {
		throw new Error(
			`初始化数据文件应包含23个配置，但实际包含 ${initData.configs?.length || 0} 个`,
		);
	}

	// 插入测试数据 - 23个配置及其工具
	const now = new Date().toISOString().replace("T", " ").slice(0, 19);

	// 插入所有配置和工具
	const insertedConfigs: Array<{
		id: number;
		name: string;
		toolCount: number;
	}> = [];
	let totalToolsInserted = 0;

	for (const configData of initData.configs) {
		// 插入配置
		const config = await db
			.insertInto("configs")
			.values({
				name: configData.name,
				version: configData.version,
				status: configData.status,
				description: configData.description,
				created_at: now,
				last_modified: now,
			})
			.returning("id")
			.executeTakeFirst();

		if (!config?.id) {
			throw new Error(`Failed to insert config: ${configData.name}`);
		}

		// 插入该配置下的工具
		const toolCount = configData.tools?.length || 0;
		if (configData.tools && configData.tools.length > 0) {
			for (const toolData of configData.tools) {
				await db
					.insertInto("tools")
					.values({
						config_id: config.id,
						name: toolData.name,
						description: toolData.description,
						input_schema: toolData.input_schema,
						output_schema: toolData.output_schema,
						callback: toolData.callback,
						created_at: now,
						last_modified: now,
					})
					.execute();
				totalToolsInserted++;
			}
		}

		insertedConfigs.push({
			id: config.id,
			name: configData.name,
			toolCount,
		});
	}

	// 导出数据库到文件
	writeFileSync(dbPath, Buffer.from(sqliteDb.export()));

	// 关闭连接
	await db.destroy();
	consola.success(`数据库已创建: ${dbPath}`);
	consola.info(
		`已插入 ${insertedConfigs.length} 个配置和 ${totalToolsInserted} 个工具`,
	);
} catch (error) {
	consola.error("数据库初始化失败:", error);
	process.exit(1);
}
