
# 🌍 2. `docs/ENVIRONMENT_INFO.md`

```markdown
# 🌍 Library Management System - 环境依赖与配置说明

> 📅 生成时间：`2026-04-08` | 🎯 适用阶段：`R1-Admin`

## 🖥 基础运行环境
| 组件 | 版本要求 | 备注 |
|------|----------|------|
| **Node.js** | `>=20.18.0`（推荐 `20.19+` 或 `22.x LTS`） | 项目使用 ESM + Vite 8，低版本会报 `EBADENGINE` 警告（**安全可忽略**） |
| **npm** | `>=10.8.0` | 必须使用 `npm`（已锁定 `package-lock.json`） |
| **Git** | `>=2.30` | 用于代码版本管理 |
| **操作系统** | Windows 10/11 / macOS 12+ / Ubuntu 20.04+ | 跨平台兼容，SQLite 零配置 |

## 📦 核心技术栈
| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| **后端** | Express 4.x + Prisma 5/6 + SQLite | RESTful API + 本地文件数据库 |
| **前端** | Vite 8 + React 18/19 + React Router 6 | 热更新 (HMR) + 客户端路由 |
| **UI/样式** | Tailwind CSS 3/4 + shadcn/ui | 按需组件，路径别名 `@` 指向 `src/` |

## 🌐 端口与访问地址
| 服务 | 默认端口 | 访问地址 | 说明 |
|------|----------|----------|------|
| 后端 API | `3001` | `http://localhost:3001` | 健康检查：`/health` |
| 前端 Dev | `5173` | `http://localhost:5173` | Admin 入口：`/admin/users` |
| Prisma Studio | `5555` | `http://localhost:5555` | 数据库可视化（按需启动） |

> ⚠️ 端口冲突解决：
> - 后端：修改 `backend/.env` → `PORT=3002`
> - 前端：修改 `frontend/vite.config.js` → `server: { port: 5174 }`

## 🔑 环境变量配置
项目使用 `.env` 管理配置。**交付包中仅含 `.env.example`，接收方需复制并重命名**。
```env
# backend/.env.example
DATABASE_URL="file:./dev.db"
PORT=3001
```
- 默认使用 SQLite 本地文件，无需配置主机/账号/密码
- 若需切换 MySQL/PostgreSQL，修改 `DATABASE_URL` 后执行 `npx prisma migrate dev`

## 📁 关键交付文件清单
✅ **必须包含**：
- `backend/prisma/schema.prisma` & `seed.js`
- `backend/package.json` & `package-lock.json`
- `frontend/vite.config.js`（含 `@` 路径别名）
- `frontend/package.json` & `package-lock.json`
- `docs/`（本文件 + API契约 + 启动指南）

❌ **必须排除**（已在 `.gitignore`）：
- `node_modules/`、`.env`、`*.db`、`dist/`、`.DS_Store`、`*.log`

## ⚠️ 已知限制与注意事项
1. **R1 鉴权**：所有 `/api/admin/*` 接口开放访问，`checkAdminAuth` 为占位中间件（仅 `next()`）
2. **软删除策略**：用户停用 → `status=DEACTIVATED`；图书移除 → `isDeleted=true`。列表查询默认过滤已删除项
3. **路径别名**：前端 `@` 指向 `./src`，依赖 `vite.config.js` 配置，请勿删除
4. **引擎警告**：`EBADENGINE Unsupported engine` 仅提示 Node 版本略低于 Vite 8 推荐值，**不影响编译与运行**
