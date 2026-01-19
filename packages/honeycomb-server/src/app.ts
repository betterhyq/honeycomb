import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import consola from "consola";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { createMcpRouteHandler, createMcpServices } from "./mcp";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 创建并配置 Express 应用
 */
export async function createApp(): Promise<express.Application> {
	consola.info("[Server] 开始初始化 Express 应用");
	const app = express();
	app.use(express.json());
	consola.success("[Server] Express 应用已创建，JSON 中间件已启用");

	// 配置 CORS 跨域支持
	const corsOptions = {
		// 明确指定允许的前端源（必须和实际请求的origin一致，不能用*）
		origin: "http://pre-bdsh-mcp-hub.jd.com",
		// 允许的HTTP方法（必须包含OPTIONS，因为预检请求是OPTIONS类型）
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		// 允许的请求头（根据你的接口需求调整）
		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
		// 如果前端需要携带cookie/认证信息（比如token），必须设为true
		credentials: true,
		// 兼容旧浏览器（如IE）的预检请求响应状态码
		optionsSuccessStatus: 200,
	};
	app.use(cors(corsOptions));
	app.options("*", cors(corsOptions));
	consola.success("[Server] CORS 跨域中间件已启用");

	// 批量创建 MCP 服务
	consola.info("[Server] 开始创建 MCP 服务");
	const mcpHandlersMap = await createMcpServices();
	consola.info(
		`[Server] MCP 服务创建完成，共 ${mcpHandlersMap.size} 个服务实例`,
	);

	// ==================== 路由配置 ====================

	// Swagger UI 文档路由（需要在其他路由之前）
	consola.info("[Server] 注册 Swagger UI 文档路由: /api-docs");
	app.use(
		"/api-docs",
		swaggerUi.serve,
		swaggerUi.setup(swaggerSpec, {
			customCss: ".swagger-ui .topbar { display: none }",
			customSiteTitle: "Honeycomb API 文档",
		}),
	);

	// 注册所有 REST API 路由
	consola.info("[Server] 开始注册 REST API 路由");
	registerRoutes(app, mcpHandlersMap);
	consola.success("[Server] REST API 路由注册完成");

	// Mount the SSE endpoints (API routes should be before static files)
	consola.info("[Server] 注册 SSE 端点: GET /sse, POST /messages");
	app.get("/sse", createMcpRouteHandler(mcpHandlersMap, "get"));
	app.post("/messages", createMcpRouteHandler(mcpHandlersMap, "post"));
	consola.success("[Server] SSE 端点注册完成");

	// Serve static files from client/dist
	const clientDistPath = path.resolve(__dirname, "../../honeycomb-client/dist");
	consola.info(`[Server] 配置静态文件服务: ${clientDistPath}`);
	app.use(express.static(clientDistPath));

	// Handle SPA routing: all non-API routes should return index.html
	app.get("/", (req, res, _next) => {
		consola.debug(`[Server] SPA 路由请求: ${req.url}`);
		res.sendFile(path.join(clientDistPath, "index.html"));
	});

	// ==================== 错误处理 ====================

	// 404 处理（必须在所有路由之后，错误处理中间件之前）
	consola.info("[Server] 注册 404 处理中间件");
	app.use(notFoundHandler);

	// 统一错误处理中间件（必须是最后一个中间件）
	consola.info("[Server] 注册统一错误处理中间件");
	app.use(errorHandler);

	return app;
}
