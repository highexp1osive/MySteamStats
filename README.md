# MySteamStats

连接 Steam 账号，深度分析你的游戏人生。

制作这个项目的初衷是，本人热衷于查看各种年度总结用户总结，作为游戏玩家也不满足只看steam官方的年度总结。半年前使用过[steam-stats](https://github.com/pengx17/steam-stats)的在线网站，觉得很不错，后来这个项目也停止线上的维护了。刚巧最近deepseek v4上线打折，想体验一下完全的vibe coding开发网站，积累一些相关经验。本项目也模仿了一些steam-stats项目的功能，后续也会继续开发一些新的功能。

第一次做这种项目，可能有不够规范的地方，还需要继续学习。

本项目主要使用 Claude Code + DeepSeek V4 Pro 完成，体验了一次完整的 Vibe Coding 开发流程并测试 DeepSeek V4 的性能，总计耗时12小时。过程中记录了一些经验。



[**在线体验**](https://my-steam-stats.vercel.app/) [经验总结](https://acngabohgjo8.feishu.cn/wiki/Zs0hwlKEkigfoAkeA12cGhagnTb)

注意：因为需要登录steam，优先推荐使用本地部署，更安全。上线在线体验网站也主要是为了积累一些线上网页运维的经验，本人只支持上线一个月（5.3-6.3），不能保证对项目的长期维护，在上线期间如果发生任何错误欢迎指出，但是不能保证彻底的隐私安全。

另外由于项目使用的是vercel的服务器，连接需要使用魔法。

封面拼图算法和图片代理方案借鉴了 [pengx17/steam-stats](https://github.com/pengx17/steam-stats)，感谢作者的开源贡献。

## 功能

- **Steam 一键登录** — 通过 Steam OpenID 安全登录，无需注册
- **游戏库展示** — 网格展示全部游戏，支持搜索、排序、类型筛选
- **封面拼图** — 螺旋排列生成高清封面大图，时长越久越靠近中心，一键保存 PNG
- **游戏通关标记** — 点击卡片标记已通关，拼图自动添加通关标识
- **AI 玩家锐评** — 基于游戏库数据，DeepSeek 给出深度性格分析和毒舌总结
- **智能游戏推荐** — 清 Backlog / 继续沉迷双模式，库内+库外混合推荐

## 技术栈

Next.js 14 + TypeScript / PostgreSQL + Prisma / Tailwind CSS / Steam OpenID / DeepSeek V4 Flash

---

## 本地运行

### 前提

- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 16](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)（安装时记住 postgres 用户的密码）

### 步骤

**1. 克隆项目**
```bash
git clone https://github.com/highexp1osive/MySteamStats.git
cd MySteamStats
```

**2. 安装依赖**
```bash
npm install
```

**3. 配置环境变量**
```bash
cp .env.example .env
```
编辑 `.env`，填入：
```env
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/mysteamstats"
STEAM_API_KEY="你的Key"           # 去 https://steamcommunity.com/dev/apikey 免费申请
DEEPSEEK_API_KEY="你的Key"        # 去 https://platform.deepseek.com 注册充值 ¥1
DEEPSEEK_BASE_URL="https://api.deepseek.com"
SESSION_SECRET="随便输一段32位以上的随机字符串"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
HTTP_PROXY=""                     # 在国内需要填代理地址，如 http://127.0.0.1:7890
```

**4. 创建数据库表**
```bash
npx prisma db push
```

**5. 启动**
```bash
npm run dev
```
浏览器打开 http://localhost:3000

**6. 登录使用**

先确保 Steam 隐私设置中"游戏详情"为**公开**，然后点"连接 Steam"登录。

---

## Vercel 部署（免费，公网可访问）

1. Fork 本项目到你的 GitHub
2. 注册 [Neon](https://neon.tech) → 创建 PostgreSQL 16 数据库 → 复制连接字符串
3. 注册 [Vercel](https://vercel.com) → Import 仓库
4. Vercel → Settings → Environment Variables，添加：

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon 数据库连接字符串 |
| `STEAM_API_KEY` | 你的 Steam Web API Key |
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `SESSION_SECRET` | 随机字符串（至少 32 位） |
| `NEXT_PUBLIC_APP_URL` | Vercel 分配的域名（如 `https://xxx.vercel.app`） |

5. 本地执行一次建表（用 Neon URL）：
```bash
DATABASE_URL="Neon连接字符串" npx prisma db push
```
6. Vercel 点 Deploy，完成。

---

## Docker 部署

```bash
git clone https://github.com/highexp1osive/MySteamStats.git
cd MySteamStats
cp .env.example .env
# 编辑 .env 填入配置
docker-compose up -d
# 访问 http://localhost:3000
```

---

## 申请 API Key

- **Steam API Key**：访问 [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)，填 `localhost` 作为域名，免费
- **DeepSeek API Key**：访问 [platform.deepseek.com](https://platform.deepseek.com)，注册并充值最低 ¥1，在 API Keys 页面创建

## 注意事项

- 需要将 Steam 个人资料的「游戏详情」设为「公开」
- 国内网络环境访问 Steam API 需要代理，在 `.env` 中配置 `HTTP_PROXY`
- DeepSeek 每次分析约 ¥0.006，¥1 能用 150+ 次

## License

MIT
