# Honeycomb 🍯

基于 Model Context Protocol (MCP) 的服务配置管理平台，提供可视化的 MCP 服务配置和管理功能。

## ✨ 特性

- 📊 可视化配置界面（Vue.js 3 + Element Plus）
- 🔧 MCP 服务的创建、编辑、启动和停止
- 🛠️ 灵活的工具配置，支持自定义回调函数
- 📚 集成 Swagger UI API 文档
- 💾 基于 SQL.js 的本地数据持久化

## 🏗️ 项目结构

```
honeycomb/
├── packages/
│   ├── honeycomb-client/   # Vue.js 3 前端应用
│   ├── honeycomb-server/   # Express 服务器
│   ├── honeycomb-db/       # 数据库模块（SQL.js + Kysely）
│   └── honeycomb-common/   # 共享 TypeScript 类型定义
└── scripts/                # 构建脚本
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

1. **启动服务器**

```bash
cd packages/honeycomb-server
pnpm build && pnpm start
```

服务器运行在 `http://localhost:3002`

2. **启动客户端**（新终端）

```bash
cd packages/honeycomb-client
pnpm dev
```

客户端运行在 `http://localhost:5173`

### 访问应用

- **Web 界面**：http://localhost:3002
- **API 文档**：http://localhost:3002/api-docs

### 构建生产版本

```bash
pnpm build
```

## 📦 技术栈

- **前端**：Vue.js 3, Element Plus, Vite, TypeScript
- **后端**：Express, Model Context Protocol SDK, Swagger UI
- **数据库**：SQL.js, Kysely
- **工具链**：pnpm workspace, Turbo, unbuild

## 📖 API 端点

- `GET /api/v1/configs` - 获取配置列表
- `GET /api/v1/configs/:id` - 获取配置详情
- `POST /api/v1/configs` - 创建配置
- `PUT /api/v1/configs/:id` - 更新配置
- `DELETE /api/v1/configs/:id` - 删除配置
- `POST /api/v1/configs/:id/start` - 启动服务
- `POST /api/v1/configs/:id/stop` - 停止服务

## 🛠️ 开发命令

```bash
pnpm build      # 构建所有包
pnpm start      # 启动服务器
pnpm format     # 代码格式化
pnpm type-check # 类型检查
pnpm lint       # 代码检查
pnpm bumpp      # 版本管理
```

## 📝 许可证

ISC

---

Made with ❤️ by JD WMFE Team
