# MySteamStats 项目文件结构说明

## 项目文件全览

### 1. 根目录 — 项目配置层

| 文件 | 作用 |
|------|------|
| `package.json` | 项目身份证。声明依赖包（Next.js、Prisma、Three.js 等）、启动脚本（`dev`/`build`/`start`）。别人 `git clone` 后 `npm install` 就靠它知道装什么 |
| `tsconfig.json` | TypeScript 编译规则。告诉 TS 编译器多严格地检查类型，路径别名 `@/` 指向 `src/` |
| `next.config.js` | Next.js 的"开关面板"。这里最重要的是 `output: "standalone"`，让 Next.js 打包成独立可执行包，Docker 里才能直接 `node server.js` 跑起来。另外配置图片允许的 CDN 域名 |
| `tailwind.config.ts` | Tailwind CSS 的自定义配置。这里基本用默认，不做额外定制 |
| `postcss.config.js` | CSS 后处理器，Tailwind 依赖它工作，不用动 |
| `.env.example` | 环境变量模板。提交到 Git，别人拉下来复制成 `.env` 然后填自己的密钥。包含：数据库地址、DeepSeek API Key、Session 加密密钥、应用 URL |
| `.gitignore` | 告诉 Git 别提交的东西：`node_modules/`（依赖文件）、`.env`（含真实密钥）、`prisma/migrations/`（数据库迁移历史） |

### 2. Prisma 层 — 数据库

| 文件 | 作用 |
|------|------|
| `prisma/schema.prisma` | **整个项目的数据心脏。** 定义了 5 张表（User、Game、UserGame、UserReview、AIAnalysis），以及它们之间的关系。Prisma 读这个文件自动生成类型安全的查询客户端。你运行 `prisma db push` 它就直接在 PostgreSQL 里建表 |

### 3. `src/` — 源码层

#### 3.1 `src/app/` — 页面路由（Next.js App Router）

Next.js 的约定：`src/app/` 下的文件夹结构 = 网站 URL 结构。

| 文件 | URL | 作用 |
|------|-----|------|
| `layout.tsx` | 全局 | **网站外壳。** 所有页面的 HTML 骨架——`<html>`、`<body>`、顶部导航栏（Header），中间 `<main>` 区域根据 URL 渲染对应页面内容 |
| `globals.css` | — | 全局样式。只引入 Tailwind 的三个基础层（`@tailwind base/components/utilities`），加一点点暗色主题默认值 |
| `page.tsx` | `/` | **首页（公开）。** 不登录就能看。一个大标题 + 功能介绍 + "连接 Steam"按钮，吸引新用户 |
| `loading.tsx` | 全局 | Next.js 内置：页面数据还在加载时显示的骨架动画 |
| `error.tsx` | 全局 | Next.js 内置：页面出错时显示的兜底界面 + 重试按钮 |
| `dashboard/page.tsx` | `/dashboard` | **游戏库总览（需登录）。** 服务端组件，直接从数据库查用户的游戏列表，做排序过滤后渲染。包含三个统计卡（总游戏数、总时长、近两周）和游戏网格 |
| `galaxy/page.tsx` | `/galaxy` | **星系视图（需登录）。** 服务端取用户游戏数据，传给 Three.js 客户端组件渲染 3D 场景 |
| `analysis/page.tsx` | `/analysis` | **AI 分析页（需登录、客户端组件）。** 两个 Tab 切换（性格锐评 / 评测分析），点"开始分析"调 API 生成，结果缓存 24 小时 |
| `recommend/page.tsx` | `/recommend` | **推荐页（需登录）。** 服务端先算推荐，渲染卡片列表。客户端可点"换一批"重新生成 |

#### 3.2 `src/app/api/` — 后端 API 路由

这些是 Next.js 的后端能力——`src/app/api/` 下的文件自动变成 HTTP API 端点。

| 文件 | 端点 | 作用 |
|------|------|------|
| `api/auth/login/route.ts` | `GET /api/auth/login` | **登录入口。** 拼装 Steam OpenID 的认证 URL 参数（`openid.ns`、`openid.return_to` 等），浏览器跳转到 Steam 登录页 |
| `api/auth/callback/route.ts` | `GET /api/auth/callback` | **登录回调。** Steam 把用户送回来，URL 带上 OpenID 验证参数。这里做三件事：① 反向验证 OpenID 合法性 ② 提取 Steam ID ③ 从 Steam 公开页面抓昵称头像 ④ 创建/更新数据库用户 ⑤ 设置加密 session cookie ⑥ 跳转到 Dashboard |
| `api/auth/session/route.ts` | `GET /api/auth/session` | **查当前登录状态。** 前端组件调用它判断用户是否已登录，返回用户头像昵称或 null |
| `api/sync/route.ts` | `POST /api/sync` | **手动触发游戏库同步。** 爬 Steam 公开 XML 页面，更新 UserGame 表 |
| `api/analysis/route.ts` | `POST /api/analysis` | **AI 分析生成/刷新。** 接收 type 参数（personality / review_style），从 DB 取数据拼 prompt，调 DeepSeek API，结果存入 AIAnalysis 表并返回。24h 内有缓存直接返回缓存 |

#### 3.3 `src/lib/` — 核心逻辑（纯函数，不依赖 React）

| 文件 | 作用 |
|------|------|
| `db.ts` | **Prisma 数据库连接单例。** 确保整个应用只有一个 PrismaClient 实例（开发时热重载会创建多个，用 `globalThis` 缓存避免连接泄漏）。所有页面和 API 都 import `{ db }` 来查数据库 |
| `auth.ts` | **Session 管理。** 封装 `iron-session` 的读写。提供 `getSession()`（解密 cookie 获取 userId）和 `requireAuth()`（未登录就 redirect 到首页）。session 是加密存在用户浏览器 cookie 里的，不占数据库 |
| `steam.ts` | **Steam 数据抓取器。** 爬 `steamcommunity.com/profiles/{id}/games?xml=1` 解析游戏时长，爬 `steamcommunity.com/profiles/{id}/recommended/` 解析用户评测。提供 `syncGameLibrary()` 和 `syncReviews()` 两个入口函数 |
| `deepseek.ts` | **DeepSeek API 客户端。** 封装 HTTP 调用（POST `/chat/completions`），附带两个 prompt 构造器：`buildPersonalityPrompt()` 把游戏列表 JSON 转成分析 prompt，`buildReviewStylePrompt()` 把评测列表转成风格分析 prompt |
| `recommend.ts` | **推荐引擎。** 纯规则算法：从用户游戏库里找"搁置的"（玩过但长期没动）、"浅尝的"（2-10 小时就停）、"正在推的"（近两周在玩），拼出 5 个候选，再调 DeepSeek 排序写理由 |

#### 3.4 `src/components/` — UI 组件

| 文件 | 作用 |
|------|------|
| `Header.tsx` | **顶部导航栏。** Logo + 导航链接（游戏库/星系/AI锐评/推荐）+ 右侧登录按钮。`"use client"` 因为需要根据当前 URL 高亮对应导航项 |
| `SteamLoginButton.tsx` | **Steam 登录按钮。** 客户端组件，加载时调 `/api/auth/session` 判断状态。未登录显示"连接 Steam"按钮（链接到 `/api/auth/login`），已登录显示头像 + 昵称 |
| `GameCard.tsx` | **单张游戏卡片。** 显示封面图、游戏名、游玩时长、最后游玩时间。纯展示组件 |
| `GameList.tsx` | **游戏列表容器。** 客户端组件，包含搜索框、排序下拉、类型筛选下拉、游戏卡片网格。筛选和排序都在前端内存完成（数据量不大，避免额外请求） |
| `StatsOverview.tsx` | **数据统计条。** 三列数字卡片：游戏总数、总时长（小时）、近两周时长 |
| `GalaxyView.tsx` | **星系 3D 场景。** 整个项目视觉核心。用 `@react-three/fiber`（Three.js 的 React 封装）渲染：中心发光球（用户头像）、周围行星轨道排列游戏封面。时长越大封面离中心越近、尺寸越大。`OrbitControls` 支持拖拽旋转缩放 |
| `AnalysisCard.tsx` | **AI 分析展示卡。** 接收 Markdown 文本，渲染为 HTML。底部"刷新"按钮。加载中显示骨架动画 |
| `RecommendCard.tsx` | **推荐游戏卡片。** 排序号 + 封面 + 游戏名 + AI 打分（颜色随分数变化）+ 推荐理由 |
| `LoadingSpinner.tsx` | **通用加载动画。** 旋转的橙色圆环 + 可配置文字 |

#### 3.5 `src/types/` — TypeScript 类型

| 文件 | 作用 |
|------|------|
| `index.ts` | 定义项目中共享的 TypeScript 接口：`SteamGame`（Steam API 返回的游戏原始结构）、`PlayerSummary`（Steam 用户信息）、`GameWithPlaytime`（数据库查出来的游戏+时长）、`AIAnalysisResult`（AI 分析返回结构）。所有组件和 lib 函数 import 这些类型，保证类型安全 |

### 4. Docker 部署层

| 文件 | 作用 |
|------|------|
| `Dockerfile` | **应用镜像的"菜谱"。** 三阶段构建：① 装依赖 ② 编译打包 ③ 只保留运行时需要的文件（standalone 输出 + prisma）。最终镜像只有 Node.js + 几百 KB 的应用代码，非常小 |
| `docker-compose.yml` | **一键启动的"剧本"。** 定义两个服务：`app`（Next.js 应用，端口 3000）和 `db`（PostgreSQL 16，端口 5432，数据持久化到 Docker volume）。`app` 依赖 `db` 的健康检查通过后才启动 |
| `README.md` | **给开源用户看的说明书。** 写清楚怎么 `git clone`、怎么配 `.env`、怎么 `docker-compose up`、怎么申请 DeepSeek API Key |

---

## 数据流向（用户视角）

```
用户点击"连接 Steam"
  → /api/auth/login → Steam 跳转
  → 用户在 Steam 授权
  → /api/auth/callback → 验证 OpenID → 爬取 Steam 公开页面
  → 写入 User 表 → 写入 UserGame 表 → 写入 UserReview 表
  → 设置 session cookie → 跳转 /dashboard

用户在 /dashboard
  → 服务端直接查 UserGame + Game 联表
  → 渲染游戏网格（可筛选排序）

用户在 /galaxy
  → 服务端取游戏+封面 → 传给客户端 Three.js 渲染 3D

用户在 /analysis
  → 点击"开始分析" → POST /api/analysis
  → 服务端从 DB 取游戏数据 → 拼 Prompt → 调 DeepSeek
  → 结果存入 AIAnalysis 表 → 返回前端渲染
```
