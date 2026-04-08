# 🚀 3. `docs/SETUP_GUIDE.md`

```markdown
# 🚀 Library Management System - 一键启动指南

> 📅 适用版本：`R1-Admin` | ⏱ 预计耗时：`5 分钟`

## 📥 步骤 1：解压与安装依赖
```bash
# 进入项目根目录
cd library-management-system

# 安装后端依赖
cd backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```
> 💡 若下载缓慢，可临时切换国内镜像：`npm config set registry https://registry.npmmirror.com`

## 🗄 步骤 2：数据库初始化（仅需首次）
```bash
cd backend

# 1. 生成 Prisma Client
npx prisma generate

# 2. 创建/同步数据库结构（自动创建 dev.db）
npx prisma migrate dev

# 3. 注入种子数据（4个测试用户 + 20本图书）
node prisma/seed.js

cd ..
```
✅ 成功后 `backend/prisma/dev.db` 将自动生成并包含完整测试数据。

## ▶️ 步骤 3：启动服务（需两个终端）
```bash
# 终端 1：启动后端 API
cd backend
npm run dev
# 预期输出：🚀 Server running on port 3001

# 终端 2：启动前端开发服务器
cd frontend
npm run dev
# 预期输出：➜  Local:   http://localhost:5173/
```

## ✅ 步骤 4：验证与访问
| 验证项 | 操作 | 预期结果 |
|--------|------|----------|
| 后端健康检查 | 浏览器访问 `http://localhost:3001/health` | `{"status":"ok","message":"Library API is running"}` |
| 管理员接口 | 终端执行 `curl http://localhost:3001/api/admin/users` | 返回 `200` + 5条用户 JSON 数据 |
| 前端页面 | 浏览器访问 `http://localhost:5173/admin/users` | 显示用户表格 + “+新增用户”按钮 + Toast 提示 |
| 数据库可视化 | `cd backend && npx prisma studio` | 打开 `localhost:5555` 可查看表结构与数据 |

## 🛠 常见问题排查 (Troubleshooting)
| 现象 | 原因 | 解决方案 |
|------|------|----------|
| `EBADENGINE Unsupported engine` | Node 版本略低于 Vite 8 推荐值 | **可安全忽略**，不影响运行 |
| `Cannot find module '@/xxx'` | 依赖未安装或 `vite.config.js` 被修改 | 重新执行 `npm install`，确认 `resolve.alias` 存在 |
| `PrismaClient is not constructed` | 未生成客户端类型 | 进入 `backend/` 执行 `npx prisma generate` |
| 端口 `3001` 或 `5173` 被占用 | 其他服务占用端口 | 修改 `.env` / `vite.config.js` 端口，或 `npx kill-port 3001` |
| 前端请求报 `404` | `API_BASE` 路径不匹配 | 确认 `frontend/src/lib/api.js` 中为 `http://localhost:3001/api/admin` |
| `seed.js` 报错 `P2002` | 数据库已存在种子数据 | 删除 `backend/prisma/dev.db` 后重新 `migrate dev` + `seed` |

## 📝 交付前自检清单（发送前请核对）
- [ ] 已删除 `backend/.env` 中的敏感信息，仅保留 `.env.example`
- [ ] `package-lock.json` 未被忽略，确保依赖版本绝对一致
- [ ] `prisma/schema.prisma` 包含 `User.status` 与 `Book.isDeleted/stock` 字段
- [ ] 前端 `vite.config.js` 保留 `@` 路径别名配置
- [ ] 测试 `全新目录 → npm install → migrate dev → seed → npm run dev` 全流程畅通
- [ ] 附带 `API_CONTRACT.md` 与 `ENVIRONMENT_INFO.md`

> 📌 提示：按本指南操作即可 **5 分钟内还原完整开发环境**。R2 阶段接入 STU/LIB 登录接口后，仅需替换 `checkAdminAuth` 中间件逻辑，其余架构与启动流程保持不变。
```
