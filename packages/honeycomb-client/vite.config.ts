import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		AutoImport({
			resolvers: [ElementPlusResolver()],
		}),
		Components({
			resolvers: [ElementPlusResolver()],
		}),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// 将 node_modules 中的依赖分离到不同的 chunk
					if (id.includes("node_modules")) {
						// Element Plus 单独打包
						if (id.includes("element-plus")) {
							return "element-plus";
						}
						// highlight.js 单独打包
						if (id.includes("highlight.js")) {
							return "highlight";
						}
						// Vue 相关依赖单独打包
						if (id.includes("vue") || id.includes("@vue")) {
							return "vue-vendor";
						}
						// 其他第三方库打包到一起
						return "vendor";
					}
				},
			},
		},
		chunkSizeWarningLimit: 1000, // 提高警告阈值到 1000KB
		// 使用 esbuild 进行压缩（Vite 默认，性能更好）
		minify: "esbuild",
		// 启用 CSS 代码分割
		cssCodeSplit: true,
		// 优化构建输出
		reportCompressedSize: true,
	},
});
