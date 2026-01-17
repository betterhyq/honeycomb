import "dotenv/config";
import consola from "consola";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// 错误处理
process.on("unhandledRejection", (reason, promise) => {
  consola.error("[Unhandled Rejection] 未处理的 Promise 拒绝:", reason);
  if (NODE_ENV === "development") {
    console.error("Promise:", promise);
  }
});

process.on("uncaughtException", (error) => {
  consola.error("[Uncaught Exception] 未捕获的异常:", error);
  process.exit(1);
});

// 创建并启动应用
try {
  const app = await createApp();

  const server = app.listen(PORT, HOST, () => {
    consola.success("═══════════════════════════════════════════════════════");
    consola.success(`🚀 Express MCP SSE server running on ${HOST}:${PORT}`);
    consola.info(`📚 API 文档地址: http://${HOST}:${PORT}/api-docs`);
    consola.info(`🌐 应用访问地址: http://${HOST}:${PORT}`);
    consola.info(`🌍 环境: ${NODE_ENV}`);
    consola.success("═══════════════════════════════════════════════════════");
  });

  // 优雅关闭
  const gracefulShutdown = (signal: string) => {
    consola.info(`[${signal}] 收到关闭信号，开始优雅关闭...`);
    server.close(() => {
      consola.success("服务器已关闭");
      process.exit(0);
    });

    // 强制关闭超时
    setTimeout(() => {
      consola.error("强制关闭服务器");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
} catch (error) {
  consola.error("启动应用失败:", error);
  process.exit(1);
}
