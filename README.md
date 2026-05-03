# MySteamStats

连接 Steam 账号，深度分析你的游戏人生。

![screenshot](https://img.shields.io/badge/status-live-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

## 功能

- **Steam 一键登录** — 通过 Steam OpenID 安全登录，无需注册
- **游戏库展示** — 网格展示全部游戏，支持搜索、排序、类型筛选
- **封面拼图** — 螺旋排列生成高清封面大图，时长越久越靠近中心，一键保存 PNG
- **游戏通关标记** — 点击卡片标记已通关，拼图自动添加通关标识
- **AI 玩家锐评** — 基于游戏库数据，DeepSeek 给出深度性格分析和毒舌总结
- **智能游戏推荐** — 清 Backlog / 继续沉迷双模式，库内+库外混合推荐

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 数据库 | PostgreSQL + Prisma ORM |
| 样式 | Tailwind CSS |
| 认证 | Steam OpenID + iron-session |
| AI | DeepSeek V4 Flash |
| 部署 | Vercel + Neon (免费) 或 Docker Compose |
| 可视化 | Canvas 2D |

## 部署

### Vercel + Neon（推荐，免费）

1. Fork 本项目到你的 GitHub

2. 注册 [Neon](https://neon.tech)，创建 PostgreSQL 16 数据库，获取连接字符串

3. 注册 [Vercel](https://vercel.com)，导入仓库

4. 在 Vercel Settings → Environment Variables 添加：

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon 数据库连接字符串 |
| `STEAM_API_KEY` | [Steam Web API Key](https://steamcommunity.com/dev/apikey)（免费申请） |
| `DEEPSEEK_API_KEY` | [DeepSeek API Key](https://platform.deepseek.com/)（充值 ¥1 即可） |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `SESSION_SECRET` | 随机字符串（至少 32 位） |
| `NEXT_PUBLIC_APP_URL` | Vercel 分配的域名 |

5. 本地运行建表命令（用你的 Neon URL）：
```bash
DATABASE_URL="你的Neon连接串" npx prisma db push
```

6. 部署完成

### Docker 自建部署

```bash
git clone https://github.com/你的用户名/MySteamStats.git
cd MySteamStats
cp .env.example .env
# 编辑 .env 填入你的 API Key
docker-compose up -d
# 访问 http://localhost:3000
```

## 本地开发

```bash
npm install
cp .env.example .env
# 编辑 .env 填入配置
npx prisma db push
npm run dev
# 访问 http://localhost:3000
```

## 注意事项

- **Steam 游戏库隐私设置**：需要将 Steam 个人资料的「游戏详情」设为「公开」
- **代理配置**：如果服务器在国内，需要设置 `HTTP_PROXY` 环境变量才能访问 Steam API
- **DeepSeek 费用**：每次分析约 ¥0.006，¥1 能用 150+ 次

## License

MIT
