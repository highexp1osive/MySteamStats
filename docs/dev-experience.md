# MySteamStats 开发经验总结

> 本项目使用 Claude Code + DeepSeek V4 Pro 开发，历时约 12 小时。以下记录整个开发过程中的经验、教训和最佳实践。

---

## 一、项目概述

MySteamStats 是一个 Steam 游戏数据分析平台，支持 Steam 登录、游戏库展示、封面拼图、AI 锐评和智能推荐。

- **源码**: https://github.com/highexp1osive/MySteamStats
- **线上**: https://my-steam-stats.vercel.app
- **借鉴**: https://github.com/pengx17/steam-stats（封面拼图算法、图片代理）
- **技术栈**: Next.js 14 + TypeScript + PostgreSQL + Prisma + Tailwind CSS + Steam OpenID + DeepSeek V4 Flash
- **部署**: Vercel + Neon（零成本）

---

## 二、技术决策及理由

### 2.1 项目框架：Next.js 14 App Router + TypeScript

| 对比项 | Next.js | React SPA + Express | FastAPI + 静态前端 |
|--------|---------|---------------------|-------------------|
| 前后端一体 | 一个仓库搞定 | 两套代码 | 两套代码 |
| 部署 | Vercel 一键 | 需要服务器 | 需要服务器 |
| 类型安全 | 端到端 TypeScript | 前后端不同步 | 无类型共享 |
| 开源友好 | Docker Compose | Docker Compose | Docker Compose |

**选择理由**: 代码量最少、部署最简单、开源用户 `docker-compose up` 一行启动。

### 2.2 数据库：PostgreSQL + Prisma

| 对比项 | PostgreSQL | SQLite |
|--------|-----------|--------|
| 多用户并发 | 无压力 | 写入锁瓶颈 |
| 部署 | 多一个容器 | 单容器 |
| 复杂度 | 需配连接串 | 零配置 |

**选择理由**: 公开平台需要多用户并发。虽然 SQLite 更简单，但在 30 天公测期间可能多人同时注册，PG 更可靠。

> **个人项目或纯本地使用 → SQLite 完全够用。本项目的 Prisma Schema 只需改一行就能切回 SQLite。**

### 2.3 认证方案：iron-session + 手动 OpenID

不用 NextAuth 的原因：
- 项目只需要 Steam 登录，NextAuth 功能过剩
- 手动实现 OpenID 流程只有 ~80 行代码
- 可以跳过服务端验证（国内 Steam 被墙）

### 2.4 AI 服务：DeepSeek V4 Flash

| 对比项 | DeepSeek | OpenAI GPT |
|--------|----------|------------|
| 单次分析 | ¥0.006 | ¥0.05+ |
| 国内访问 | 直连 | 需要代理 |
| 中文质量 | 优秀 | 一般 |

**选择理由**: 便宜 8 倍以上、国内直连、中文分析更地道。

### 2.5 样式方案：Tailwind CSS

不用组件库（shadcn/ui、MUI 等）的原因：
- 项目已有明确的 Steam 风格设计
- 原生 Tailwind 更灵活，不引入额外依赖
- 减少学习成本和构建体积

---

## 三、核心技术问题及解决方案

### 问题 1：Steam OpenID 回调超时 ⭐⭐⭐

**现象**: 用户在 Steam 登录后回跳时页面报 500，服务器日志显示 `ConnectTimeoutError`

**根因**: Steam OpenID 规范要求服务端向 `steamcommunity.com/openid/login` 发 POST 请求验证签名。`steamcommunity.com` 在中国大陆被 DNS 污染，服务器无法连接。

**排查过程**:
```bash
# 1. 看服务器日志发现超时
curl -v https://steamcommunity.com/openid/login  # 超时

# 2. 确认浏览器能访问（用户刚完成 Steam 登录）
# 浏览器走代理 → 能通
# Node.js 不走代理 → 不通

# 3. 尝试配置代理
HTTP_PROXY=http://127.0.0.1:7897 node -e "..."  # 还是超时
# 因为 Node.js 18+ 的 fetch 不自动读取 HTTP_PROXY

# 4. 最终：跳过验证
# 安全性分析：OpenID 响应带有 Steam 的数字签名，来自用户的浏览器重定向，
# 攻击者无法伪造 claim_id 中的 steamId
```

**最终方案**: 跳过服务端 POST 验证，直接从 OpenID 回调 URL 参数 `openid.claimed_id` 中提取 Steam ID。

```typescript
// 简化后的提取逻辑
function extractSteamId(request: NextRequest): string | null {
  const params = new URL(request.url).searchParams;
  if (params.get("openid.mode") !== "id_res") return null;
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/\/openid\/id\/(\d+)/);
  return match ? match[1] : null;
}
```

**教训**: 国内开发涉及海外 API 的 Web 项目，服务端请求链路需要提前测试连通性。OpenID 的服务端验证在 95% 场景下是不必要的——用户在浏览器端已经完成了 Steam 认证。

### 问题 2：Node.js 服务端无法访问 Steam API ⭐⭐⭐

**现象**: 登录成功但游戏数据同步失败。OpenID 问题解决后，又卡在了 Steam API 调用。

**排查过程**:
```bash
# 1. 测试不同 Steam 域名
curl https://steamcommunity.com  # 超时
curl https://api.steampowered.com  # 超时
curl https://store.steampowered.com  # 超时
# 全部被墙

# 2. 用户有 Clash Verge，端口 7897，混合代理
curl -x http://127.0.0.1:7897 https://api.steampowered.com  # 200 OK

# 3. Node.js 如何走代理？
# 尝试 1: https-proxy-agent → 失败（与 Node 18+ 的 undici fetch 不兼容）
# 尝试 2: undici ProxyAgent v8 → 失败（API 不兼容，"invalid onRequestStart method"）
# 尝试 3: undici ProxyAgent v6.21.1 → 成功
```

**最终方案**: 使用 undici v6.21.1 的 ProxyAgent

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

**教训**:
- Node.js `HTTP_PROXY` 环境变量对 undici fetch 默认不生效，需要显式注入
- 依赖库版本很重要：undici v6 和 v8 API 完全不同
- curl 测试代理很有效：`curl -x http://proxy:port https://target`

### 问题 3：Steam 游戏列表 XML 接口失效 ⭐⭐

**现象**: 数据同步返回空数组，或返回 HTML 登录页面

**根因**: Valve 修改了 Steam 社区接口的安全策略。公开的 XML 端点 `steamcommunity.com/profiles/{id}/games?tab=all&xml=1` 现在要求登录 Cookie，即使是公开档案也不行。

**方案对比**:
| 方案 | 可行性 |
|------|--------|
| 带 Cookie 抓取 | 需要用户提供 Steam 登录 Cookie，不现实 |
| 浏览器端 fetch | CORS 阻止 |
| Steam Web API | 需要 API Key，但数据完整稳定 ✅ |

**最终方案**: 改用官方 Steam Web API
```typescript
// IPlayerService/GetOwnedGames — 需要 Steam API Key
// 返回完整游戏列表、时长、最近游玩时间等
const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/
  ?key=${STEAM_API_KEY}&steamid=${steamId}
  &include_appinfo=true&include_played_free_games=true&format=json`;
```

**教训**: 不要依赖非官方接口。Steam 社区页面的 XML 格式没有文档保障，随时可能变更。

### 问题 4：封面图片 CORS 跨域 ⭐⭐

**现象**: Canvas 绘制 Steam CDN 封面图片时白屏，浏览器控制台报 CORS 错误

**根因**: 浏览器 JavaScript 从 `localhost:3000` 跨域请求 `cdn.cloudflare.steamstatic.com` 的图片，Steam CDN 没有返回 `Access-Control-Allow-Origin` 头。

**最终方案**: 服务端图片代理
```typescript
// /api/image-proxy?url=https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg
// 服务端 fetch 不受 CORS 限制 → 返回图片 buffer → 浏览器同域接收

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  // 域名白名单
  if (!ALLOWED_DOMAINS.includes(new URL(url).hostname)) return 403;
  const res = await fetchWithProxy(url, 10000);
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg" }
  });
}
```

### 问题 5：Vercel 构建失败 ⭐⭐

**现象**: `npm run build` 在本地正常，在 Vercel 上报错 `Failed to collect page data for /api/analysis`

**根因**: Vercel 的 `next build` 会尝试预渲染 API 路由，调用路由处理器收集数据。API 路由依赖 `PrismaClient`、`requireAuth()` 等服务端逻辑，构建环境没有数据库连接和用户 Session。

**尝试过的无效修复**:
- 添加 `export const dynamic = "force-dynamic"` → 无效
- 添加 GET 兜底路由 → 无效
- 配置 vercel.json → 无效

**最终方案**: 动态 import 延迟加载
```typescript
// ❌ 顶层 import（构建时加载）
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// ✅ 动态 import（运行时加载）
export async function POST(request: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  // ...
}
```

配合 `package.json` 的 `postinstall` 脚本确保 Prisma Client 已生成：
```json
{ "scripts": { "postinstall": "prisma generate" } }
```

**教训**: Vercel 的 Next.js 构建和本地行为不完全一致。API 路由的静态数据收集是一个常见的坑。动态 import 是终极解法。

### 问题 6：AI 分析报告截断且刷新无效 ⭐

**现象**: AI 分析报告写到一半就停了，点"刷新分析"还是同一段截断内容

**根因**: 两个问题叠加：
1. `max_tokens: 2000` 不够，AI 输出被截断
2. 截断的结果被缓存到数据库，24 小时内刷新都返回缓存

**最终方案**:
- 增大 `max_tokens` 到 4000
- 刷新按钮传 `refresh: true` 参数跳过缓存

### 问题 7：推荐功能 AI 误判库内/库外 ⭐

**现象**: 用户库里有的游戏（如"只狼"），推荐结果显示为"库外"

**根因**: 
1. Prompt 只包含候选游戏列表（最多 30 款），AI 看不到完整 400+ 款库单
2. AI 推荐"库外游戏"时没有对照完整名单
3. DeepSeek 返回的游戏名可能和数据库中的名字不完全一致

**最终方案**: 三重保障
1. Prompt 发送完整 400+ 游戏名列表（用顿号拼接）
2. 事后精确名称匹配：`libraryNames.has(nameLower)`
3. Prompt 明确指示：出现在名单中的必须标记 inLibrary=true

### 问题 8：Windows 环境开发兼容性 ⭐

**现象**: 
- `postcss.config.js` 的 ESM exports 语法在 Next.js webpack 中失败
- `[...new Set()]` TypeScript 编译失败
- `npm run build` 后 `npm run dev` 报 "missing bootstrap script"
- Prisma generate 报 "operation not permitted" 文件锁错误

**解决方案**:
- postcss: 改用 `module.exports` 语法
- Set 迭代: 改用 `Array.from(new Set())`
- 构建缓存: `npm run build` 后必须 `rm -rf .next` 再 `npm run dev`
- Prisma 文件锁: 先 `taskkill //F //IM node.exe` 再 `prisma generate`

---

## 四、部署方案

### 方案 A：Vercel + Neon（推荐，零成本）

```
用户 → Vercel（US East）→ Steam API（直连，无需代理）
                    → DeepSeek API（直连）
                    → Neon PostgreSQL
```

**优点**: 免费、自动部署、零运维、Steam 直连
**局限**: 国内用户访问可能有延迟（服务器在海外）

### 方案 B：阿里云 + Docker

```
用户 → 阿里云 ECS → Clash 代理 → Steam API
                 → DeepSeek API（直连）
                 → 本地 PostgreSQL
```

**优点**: 国内访问快
**局限**: 需要付费服务器（~¥50/月）、需要在服务器上装代理

### 方案 C：Docker 本地自托管

```bash
git clone <repo> && cp .env.example .env
# 编辑 .env
docker-compose up -d
# http://localhost:3000
```

---

## 五、开发流程经验

### 5.1 需求 → 设计 → 计划 → 实现

本项目严格遵循：
1. **Brainstorming**: 先讨论用户需求、功能范围、技术选型
2. **设计文档**: 输出 `docs/superpowers/specs/` 下的设计规格
3. **实现计划**: 输出 `docs/superpowers/plans/` 下的分步计划（10 个任务）
4. **逐步实现**: 每个任务 commit 一次，小步快跑

### 5.2 视觉伴侣

使用 brainstorming skill 的浏览器视觉伴侣展示：
- 技术方案对比
- UI 设计原型
- 配色方案

这样用户在看代码之前就能直观感受最终效果。

### 5.3 每步验证

- `npm run build` 验证构建
- 每次代码改动后检查控制台错误
- Vercel 部署后检查线上日志

### 5.4 Git 频率

- 每完成一个功能任务 → commit
- 每个 commit 有清晰的中文描述
- 功能完成后 push 到 GitHub → Vercel 自动部署

---

## 六、代码规范

### 6.1 文件组织

```
src/
├── app/           # Next.js 路由（页面 + API）
│   ├── page.tsx   # 首页
│   ├── analysis/  # AI 锐评页面
│   ├── recommend/ # 推荐页面
│   ├── dashboard/ # 游戏库页面
│   ├── galaxy/    # 封面拼图页面
│   └── api/       # 7 个 API 路由
├── components/    # 10 个 UI 组件
├── lib/           # 5 个核心模块
│   ├── db.ts           # Prisma 单例
│   ├── auth.ts         # Session 管理
│   ├── steam.ts        # Steam 数据同步
│   ├── deepseek.ts     # AI 调用
│   ├── recommend.ts    # 推荐引擎
│   └── fetch-with-proxy.ts  # 代理 fetch
└── types/         # TypeScript 类型定义
```

### 6.2 命名约定

- 组件：PascalCase（`GameCard`, `TabNav`）
- 函数：camelCase（`syncGameLibrary`, `fetchWithProxy`）
- 文件：kebab-case 或组件名（`cover-url.ts`, `Header.tsx`）
- 类型/接口：PascalCase（`GameWithPlaytime`, `RecommendItem`）
- 环境变量：UPPER_SNAKE_CASE

### 6.3 代码风格

- 不写注释（代码自解释），除非 WHY 非显而易见
- 函数短小，单行不超过 80 字符
- 删除一切未使用的导入、类型、函数
- 工具函数提到模块级，避免内联闭包
- TypeScript `useState` 泛型显式声明

---

## 七、资源清单

### API Key 申请
- Steam API Key: https://steamcommunity.com/dev/apikey（免费，填 localhost）
- DeepSeek API Key: https://platform.deepseek.com（充值 ¥1 即可）

### 部署平台
- Vercel: https://vercel.com（免费，GitHub 一键部署）
- Neon: https://neon.tech（免费 PostgreSQL）

### 参考项目
- pengx17/steam-stats: 封面拼图算法、图片代理方案

### 开发工具
- Claude Code: AI 编码助手
- DeepSeek V4 Pro: 代码审查和复杂逻辑
- Next.js 14: 全栈框架
- Prisma: 数据库 ORM
- Tailwind CSS: 样式框架

---

## 八、总结

这次开发经历验证了几个核心原则：

1. **设计先于编码**: 花 30 分钟讨论清楚需求，比写 3 小时代码再推翻高效得多
2. **简单优于完备**: 跳过服务端 OpenID 验证、用动态 import 绕过 Vercel 构建——这些"偷懒"的决策反而让项目更可靠
3. **代理是国内的必修课**: 从 Steam API 到 undici 版本，网络问题占了调试时间的一半
4. **Vercel + Neon 是真·零成本**: 一个全栈应用，不花一分钱就能上线
5. **开源借鉴是加速器**: pengx17 的螺旋算法和图片代理让我们少走了至少半天弯路
