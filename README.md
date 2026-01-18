# Honeycomb 🍯

基于 Model Context Protocol (MCP) 的服务配置管理平台，提供可视化的 MCP 服务配置和管理功能。

![site](./site.png)

## ✨ 特性

- 📊 **可视化配置界面**：基于 Vue.js 3 + Element Plus 的现代化 UI
- 🔧 **服务管理**：MCP 服务的创建、编辑、启动和停止
- 🛠️ **灵活的工具配置**：支持自定义工具回调函数，灵活配置输入/输出 Schema
- 📚 **API 文档**：集成 Swagger UI，提供完整的 API 文档
- 💾 **本地数据持久化**：基于 SQL.js 的轻量级数据库，无需额外数据库服务
- 🏗️ **Monorepo 架构**：使用 pnpm workspace + Turbo 构建的高效开发体验
- 🔒 **类型安全**：全面使用 TypeScript，确保类型安全

## 🚀 快速开始

### 前置要求

- **Node.js** >= 24.11.1（推荐使用 `.nvmrc` 中指定的版本）
- **pnpm** >= 10.25.0（推荐使用 `package.json` 中指定的版本）

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/betterhyq/honeycomb.git
cd honeycomb

# 安装依赖
pnpm install

# 初始化数据库
pnpm init-db

# 构建项目
pnpm build

# 启动服务
pnpm start
```

访问应用：
- **Web 界面**：http://0.0.0.0:3002
- **API 文档**：http://0.0.0.0:3002/api-docs

### 开发模式

```bash
# 启动前端开发服务器（热重载）
pnpm --filter=@betterhyq/honeycomb-client dev

# 启动后端开发服务器（需要先构建）
pnpm build
pnpm start
```

## 🚢 部署方式

项目使用 Docker 进行部署，采用两阶段构建方式：

### 1. 构建基础镜像

首先使用 `container/Dockerfile` 构建基础镜像，该镜像包含 Node.js 运行环境：

```bash
docker build -f container/Dockerfile -t honeycomb-base:latest .
```

### 2. 构建实例制品

然后使用 `docker/Dockerfile` 构建用于部署的实例制品：

```bash
docker build -f docker/Dockerfile -t honeycomb:latest .
```

### 3. 运行容器

```bash
docker run -d -p 80:80 honeycomb:latest
```

访问应用：
- **Web 界面**：http://ip
- **API 文档**：http://ip/api-docs

> 注意：容器内部通过 nginx 进行端口转发，nginx 监听 80 端口并将请求转发到后端服务（默认 3002 端口）。

## 🏗️ 项目结构

```
honeycomb/
├── packages/
│   ├── honeycomb-client/    # Vue.js 3 前端应用
│   ├── honeycomb-server/    # Express 服务器
│   ├── honeycomb-db/        # 数据库模块（SQL.js + Kysely）
│   └── honeycomb-common/    # 共享 TypeScript 类型定义
├── scripts/                 # 构建和版本管理脚本
└── turbo.json               # Turbo 构建配置
```

## 🛠️ 开发命令

```bash
pnpm install    # 安装依赖
pnpm build      # 构建所有包
pnpm test       # 运行测试
pnpm lint       # 代码检查
pnpm format     # 代码格式化
pnpm check      # 类型检查
pnpm clean      # 清理构建产物
pnpm commit     # 规范化提交
```

## 📦 技术栈

- **前端**：Vue.js 3 + Element Plus + Vite + TypeScript
- **后端**：Express 5 + MCP SDK + Swagger UI + Zod
- **数据库**：SQL.js + Kysely
- **工具链**：pnpm + Turbo + Biome + Vitest

## 📖 文档

- [架构说明](./ARCHITECTURE.md) - 架构设计和技术实现
- [贡献指南](./CONTRIBUTING.md) - 参与项目贡献
- [变更日志](./CHANGELOG.md) - 版本更新记录

## 🤝 贡献

欢迎所有形式的贡献！请查看 [贡献指南](./CONTRIBUTING.md) 了解详情。

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证。

---

Made with ❤️ by YONGQI
