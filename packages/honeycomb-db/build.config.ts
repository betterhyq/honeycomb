import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["./src/index", "./src/init"],
	declaration: true,
	failOnWarn: false,
	externals: ["kysely", "kysely-wasm", "sql.js"],
	hooks: {
		"build:done": () => {
			// 复制 init-data.json 到 dist 目录
			const srcPath = resolve("src/init-data.json");
			const distPath = resolve("dist/init-data.json");
			if (existsSync(srcPath)) {
				copyFileSync(srcPath, distPath);
			}
		},
	},
});
