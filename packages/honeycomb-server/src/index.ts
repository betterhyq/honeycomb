import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import consola from "consola";
import { createMcpServices, createMcpRouteHandler } from "./mcp";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== Swagger 配置 ====================

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Honeycomb MCP Server API",
      version: "1.0.0",
      description: "Honeycomb MCP 服务配置管理 API 文档",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: `http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || 3002}`,
        description: "本地开发服务器",
      },
    ],
    components: {
      schemas: {
        QueryConfigVO: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "配置 ID",
            },
            name: {
              type: "string",
              description: "服务名称",
            },
            version: {
              type: "string",
              description: "版本号",
              example: "1.0.0",
            },
            status: {
              type: "string",
              enum: ["running", "stopped"],
              description: "服务状态",
            },
            statusText: {
              type: "string",
              description: "状态文本",
              example: "运行中",
            },
            description: {
              type: "string",
              description: "服务描述",
            },
            tools: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Tool",
              },
              description: "工具列表",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "创建时间",
            },
            lastModified: {
              type: "string",
              format: "date-time",
              description: "最后修改时间",
            },
          },
          required: [
            "id",
            "name",
            "version",
            "status",
            "statusText",
            "description",
            "tools",
            "createdAt",
            "lastModified",
          ],
        },
        Tool: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "工具名称",
            },
            description: {
              type: "string",
              description: "工具描述",
            },
            input_schema: {
              type: "string",
              description: "输入 Schema（JSON Schema 字符串）",
            },
            output_schema: {
              type: "string",
              description: "输出 Schema（JSON Schema 字符串）",
            },
            callback: {
              type: "string",
              description: "回调函数代码",
            },
          },
          required: ["name", "description"],
        },
        ApiResponse: {
          type: "object",
          properties: {
            code: {
              type: "integer",
              description: "响应代码",
            },
            msg: {
              type: "string",
              description: "响应消息",
            },
            data: {
              type: "object",
              description: "响应数据",
            },
          },
          required: ["code", "msg"],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            code: {
              type: "integer",
              description: "错误代码",
            },
            msg: {
              type: "string",
              description: "错误消息",
            },
            data: {
              type: "null",
              description: "错误时数据为 null",
            },
          },
          required: ["code", "msg", "data"],
        },
      },
    },
    tags: [
      {
        name: "Configs",
        description: "MCP 服务配置管理",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // 指向包含 JSDoc 注释的文件
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==================== 应用初始化 ====================

consola.info("[Server] 开始初始化 Express 应用");
const app = express();
app.use(express.json());
consola.success("[Server] Express 应用已创建，JSON 中间件已启用");

// 批量创建 MCP 服务
consola.info("[Server] 开始创建 MCP 服务");
const mcpHandlersMap = await createMcpServices();
consola.info(`[Server] MCP 服务创建完成，共 ${mcpHandlersMap.size} 个服务实例`);

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
app.get("/", (req, res, next) => {
  consola.debug(`[Server] SPA 路由请求: ${req.url}`);
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  consola.success("═══════════════════════════════════════════════════════");
  consola.success(`🚀 Express MCP SSE server running on ${HOST}:${PORT}`);
  consola.info(`📁 Serving client app from: ${clientDistPath}`);
  consola.info(`📚 API 文档地址: http://${HOST}:${PORT}/api-docs`);
  consola.info(`🌐 应用访问地址: http://${HOST}:${PORT}`);
  consola.success("═══════════════════════════════════════════════════════");
});
