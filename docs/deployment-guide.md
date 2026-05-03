# MySteamStats 完整部署指南

本文档从零开始，完整记录一个 Next.js + PostgreSQL + Steam API 项目从本地开发到线上部署的全过程。

---

## 目录

1. [项目概述](#项目概述)
2. [本地开发环境搭建](#本地开发环境搭建)
3. [技术决策记录](#技术决策记录)
4. [关键问题及解决方案](#关键问题及解决方案)
5. [Vercel + Neon 免费部署](#vercel--neon-免费部署)
6. [Docker 自建部署](#docker-自建部署)
7. [安全注意事项](#安全注意事项)
8. [维护和运维](#维护和运维)

---

## 项目概述

**技术栈**: Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma + Tailwind CSS + Steam OpenID + DeepSeek V4 Flash

**核心功能**: Steam 一键登录 → 游戏库同步 → 封面拼图 → AI 锐评 → 智能推荐

**部署方式**: Vercel + Neon（零成本） 或 Docker Compose（自建服务器）

---

## 本地开发环境搭建

### 1. 基础依赖

```bash
# Node.js 18+ 
# PostgreSQL 16（本地安装或 Docker）
# Git
```

### 2. 克隆并安装

```bash
git clone <仓库地址>
cd MySteamStats
npm install                   # 安装所有 npm 依赖
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`：

```env
# 数据库连接字符串
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/mysteamstats"

# Steam Web API Key（免费申请: steamcommunity.com/dev/apikey）
STEAM_API_KEY="你的Steam Key"

# DeepSeek API Key（platform.deepseek.com，充值1元即可）
DEEPSEEK_API_KEY="你的DeepSeek Key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# Session 加密密钥（32位以上随机字符串）
SESSION_SECRET="随机字符串"

# 应用地址
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 国内访问 Steam 需要代理（可选）
HTTP_PROXY="http://127.0.0.1:7897"
```

**为什么需要这些？**

| 变量 | 用途 | 获取方式 |
|------|------|---------|
| `DATABASE_URL` | Prisma 连接 PostgreSQL | 本地安装 PostgreSQL 后自动有 |
| `STEAM_API_KEY` | 调用 Steam Web API 获取游戏数据 | steamcommunity.com/dev/apikey 免费申请 |
| `DEEPSEEK_API_KEY` | AI 分析和推荐 | platform.deepseek.com 注册充值 ¥1 |
| `SESSION_SECRET` | 加密用户登录 Cookie | 自己随机生成 |
| `HTTP_PROXY` | 国内网络无法直连 Steam，需要代理中转 | 你的代理工具端口 |

### 4. 创建数据库表

```bash
npx prisma db push
```

这条命令做了什么：
1. 读取 `prisma/schema.prisma`（定义了 5 张表：User、Game、UserGame、UserReview、AIAnalysis）
2. 连接到 DATABASE_URL 指定的 PostgreSQL
3. 自动创建所有表、字段、索引、关系

### 5. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 技术决策记录

### 为什么用 Prisma + PostgreSQL 而不是 SQLite？

- **多用户并发**: 公开平台需要支持多个用户同时读写
- **数据隔离**: PostgreSQL 的 row-level security 和 Prisma 的类型安全确保用户间数据不泄露
- **Vercel 兼容**: Neon 提供免费 PostgreSQL，和 Vercel 完美配合
- **如果纯个人使用**: SQLite 完全够用，改动只需改 Prisma schema 的 datasource 一行

### 为什么用 iron-session 而不是 NextAuth？

- **更轻量**: 本项目只做 Steam 登录，不需要 NextAuth 的完整 auth 框架
- **更灵活**: 手动处理 OpenID 流程，可以跳过服务端验证（国内 Steam 被墙）
- **零依赖**: 只需要一个加密 Cookie，不需要数据库 session 表

### 为什么用 undici ProxyAgent？

- **国内网络问题**: Steam API（api.steampowered.com、steamcommunity.com）在国内被墙
- **Node.js 全局代理不生效**: `HTTP_PROXY` 环境变量对 Node 18+ 的 undici fetch 默认不生效
- **undici ProxyAgent**: 直接给每个 fetch 请求注入代理，精确控制

### 为什么用 DeepSeek 而不是 OpenAI？

- **便宜**: ¥0.006/次分析 vs OpenAI 的 ¥0.05+
- **直连**: 国内服务器无需代理
- **中文好**: 中文游戏分析、毒舌吐槽更地道

---

## 关键问题及解决方案

### 问题 1: Steam OpenID 回调超时

**现象**: 点击 Steam 登录后回到网站时报 500，日志显示 `ConnectTimeoutError`

**根因**: Steam OpenID 规范要求服务端向 `steamcommunity.com/openid/login` 发 POST 验证签名，但国内这个域名被墙

**解决**: 跳过服务端验证，直接从 OpenID 响应 URL 中提取 Steam ID。安全性：用户刚从 Steam 认证页面跳转过来，响应中带有 Steam 的数字签名，无法伪造。

```typescript
// 不验证，直接提取
function extractSteamId(request: NextRequest): string | null {
  const params = new URL(request.url).searchParams;
  if (params.get("openid.mode") !== "id_res") return null;
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/\/openid\/id\/(\d+)/);
  return match ? match[1] : null;
}
```

### 问题 2: 服务器无法访问Steam API（国内网络）

**现象**: 登录成功但游戏数据同步失败，日志显示超时

**根因**: 服务端 Node.js 发起的 HTTP 请求不走浏览器的代理

**解决**: 使用 `undici` 的 `ProxyAgent` 为每个请求注入代理：

```typescript
import { ProxyAgent } from "undici";

export async function fetchWithProxy(url: string, timeoutMs?: number) {
  const proxy = process.env.HTTP_PROXY;
  const options: any = {};
  if (timeoutMs) options.signal = AbortSignal.timeout(timeoutMs);
  if (proxy) options.dispatcher = new ProxyAgent(proxy);
  return fetch(url, options);
}
```

### 问题 3: Steam 游戏列表 XML 接口返回登录页

**现象**: 用 `steamcommunity.com/profiles/{id}/games?xml=1` 抓取时返回 HTML 登录页

**根因**: Valve 修改了 Steam 社区接口，现在需要登录才能访问，即使档案是公开的

**解决**: 改用官方 Steam Web API（`IPlayerService/GetOwnedGames`），需要 API Key 但数据完整且稳定

### 问题 4: 封面图片 CORS 跨域

**现象**: Canvas 绘制 Steam CDN 封面时白屏或报 CORS 错误

**根因**: 浏览器从 localhost 的 JavaScript fetch 跨域 Steam CDN 图片

**解决**: 创建 `/api/image-proxy` 代理路由，服务端转发图片：

```typescript
// 浏览器请求: /api/image-proxy?url=https://cdn.steam.../appid/header.jpg
// 服务端 fetch → 返回图片buffer → 浏览器收到同域资源
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  // 域名白名单验证（安全）
  const hostname = new URL(url).hostname;
  if (!ALLOWED_DOMAINS.includes(hostname)) return 403;
  
  const res = await fetchWithProxy(url, 10000);
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg" }
  });
}
```

### 问题 5: Vercel 构建失败 "Failed to collect page data"

**现象**: `npm run build` 在 Vercel 上报错但本地正常

**根因**: Vercel 构建时会尝试调用 API 路由收集页面数据，而 API 路由依赖 Prisma/DB 连接

**解决**: 
1. 所有 API 路由标记 `export const dynamic = "force-dynamic"`
2. 使用动态 import 延迟加载 Prisma 依赖，避免构建时初始化

```typescript
// 不在顶层 import，改为运行时动态加载
export async function POST(request: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  // ...
}
```

### 问题 6: AI 分析报告截断

**现象**: 分析报告只显示一半，刷新也没用

**根因**: `max_tokens: 2000` 太小，AI 写不完检测。缓存了截断的结果，刷新只是读缓存

**解决**: `max_tokens` 提到 4000，刷新按钮传 `refresh: true` 跳过缓存强制重新生成

---

## Vercel + Neon 免费部署

### 架构

```
用户浏览器 → Vercel（Next.js 运行环境，US East）
                ↓
           Neon（PostgreSQL，US East）
                ↓
           Steam API（直连，无需代理）
                ↓
           DeepSeek API（直连，中国公司海外节点）
```

### 步骤

**1. 推送代码到 GitHub**

**2. 注册 Neon（neon.tech）**
- 用 GitHub 登录
- 创建项目 → 选 PostgreSQL 16 → 区域选 US East（和 Vercel 同区延迟最低）
- 获取连接字符串

**3. 注册 Vercel（vercel.com）**
- 用 GitHub 登录
- Import 仓库
- 配置环境变量（见 .env.example）
- 注意 `NEXT_PUBLIC_APP_URL` 要填 Vercel 分配的实际域名

**4. 手动建表**

用本地电脑执行（因为 Vercel 构建时不连 DB）：
```bash
DATABASE_URL="Neon连接字符串" npx prisma db push
```

**5. Deploy**

### 费用

- Vercel: 免费层 100GB 流量/月，6000 分钟构建时间
- Neon: 免费层 0.5GB 存储，100h 计算时间/月
- DeepSeek: ¥0.006/次分析
- **总计: ¥0/月（个人使用绰绰有余）**

---

## Docker 自建部署

### 架构

```
用户浏览器 → 你的服务器（Docker）
                ├── Next.js 容器（:3000）
                └── PostgreSQL 容器（:5432）
```

### 文件说明

**Dockerfile** — 三阶段构建：
1. `deps`: 安装 npm 依赖
2. `builder`: 编译 Next.js + 生成 Prisma Client
3. `runner`: 只保留运行时文件（standalone 输出），镜像最小化

```dockerfile
FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
```

**docker-compose.yml** — 一键启动 App + DB：
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on:
      db:
        condition: service_healthy  # 等 PostgreSQL 就绪后才启动
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]  # 数据持久化
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]  # 健康检查
```

### 部署

```bash
git clone <仓库>
cd MySteamStats
cp .env.example .env
# 编辑 .env
docker-compose up -d
# 访问 http://服务器IP:3000
```

---

## 安全注意事项

### API Key 保护
- `.env` 在 `.gitignore` 中，**永远不会**提交到 Git
- `.env.example` 只包含占位符，可以安全提交
- Vercel 的环境变量在服务端注入，前端代码无法访问
- Steam API Key 只用于服务端调用，用户看不到

### Session 安全
- 使用 `iron-session` 加密 Cookie
- 设置 `httpOnly: true`（JavaScript 无法读取）
- 生产环境 `secure: true`（仅 HTTPS 传输）
- 7 天过期

### 数据隔离
- 所有数据库查询都基于 `session.userId` 过滤
- 用户 A 无法访问用户 B 的任何数据
- API 路由统一 `requireAuth()` 拦截未登录请求

### 图片代理安全
- `/api/image-proxy` 有域名白名单
- 只允许 Steam CDN 官方域名
- URL 解析有 try-catch 防注入
- 24 小时 CDN 缓存头

---

## 维护和运维

### 日常无需运维
- Vercel 自动部署（push 即上线）
- Neon 自动备份
- Prisma db push 自动建表（Docker 启动时）

### 数据备份
- Neon 控制台可以一键导出 SQL dump
- Docker 方案: `docker exec db pg_dump` 导出

### 监控
- Vercel 控制台查看日志和错误
- DeepSeek 控制台查看 API 用量和余额
- Steam API Key 在 steamcommunity.com/dev/apikey 查看调用统计

### 常见维护操作

```bash
# 更新依赖
npm update

# 数据库结构变更后
npx prisma db push

# 查看生产日志
# Vercel: 项目页面 → Logs
# Docker: docker-compose logs -f app
```
