# MineGameStats 实现计划

> **面向 AI 代理工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个公开的 Steam 游戏数据分析平台，支持 Steam 登录、游戏库展示、星系视图可视化、AI 锐评和智能推荐。

**架构：** Next.js 14 App Router 全栈应用，Prisma + PostgreSQL 数据层，Steam OpenID 认证，Three.js 3D 可视化，DeepSeek API AI 分析，Docker Compose 部署。

**技术栈：** Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS, Three.js, iron-session, DeepSeek API

---

## 文件结构

```
/d/MineGameStats/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根布局 + Header
│   │   ├── page.tsx                # 首页（公开）
│   │   ├── globals.css
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Dashboard（需登录）
│   │   ├── galaxy/
│   │   │   └── page.tsx            # 星系视图（需登录）
│   │   ├── analysis/
│   │   │   └── page.tsx            # AI 锐评+评测分析（需登录）
│   │   ├── recommend/
│   │   │   └── page.tsx            # 智能推荐（需登录）
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts  # Steam OpenID 跳转
│   │       │   └── callback/route.ts # Steam OpenID 回调
│   │       ├── sync/
│   │       │   └── route.ts        # 同步游戏库数据
│   │       └── analysis/
│   │           └── route.ts        # 生成/刷新 AI 分析
│   ├── lib/
│   │   ├── steam.ts               # Steam 数据抓取
│   │   ├── auth.ts                 # Session 工具
│   │   ├── deepseek.ts            # DeepSeek API 客户端
│   │   ├── recommend.ts           # 推荐算法
│   │   └── db.ts                   # Prisma 单例
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── SteamLoginButton.tsx
│   │   ├── GameCard.tsx
│   │   ├── GameList.tsx
│   │   ├── StatsOverview.tsx
│   │   ├── GalaxyView.tsx
│   │   ├── AnalysisCard.tsx
│   │   ├── RecommendCard.tsx
│   │   └── LoadingSpinner.tsx
│   └── types/
│       └── index.ts
```

---

### 任务 1：项目脚手架

**目标：** 初始化 Next.js 项目，安装所有依赖，配置 Tailwind 和 Prisma。

**文件：**
- 创建：`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`, `.env.example`, `prisma/schema.prisma`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/db.ts`, `src/types/index.ts`

- [ ] **步骤 1：初始化 Next.js 项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

- [ ] **步骤 2：安装额外依赖**

```bash
npm install prisma @prisma/client iron-session three @react-three/fiber @react-three/drei openid zustand
npm install -D @types/three
```

- [ ] **步骤 3：编写 Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String       @id @default(uuid())
  steamId      String       @unique
  displayName  String
  avatarUrl    String
  profileUrl   String
  lastSyncAt   DateTime?
  games        UserGame[]
  reviews      UserReview[]
  analyses     AIAnalysis[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Game {
  id          String     @id @default(uuid())
  steamAppId  Int        @unique
  name        String
  coverUrl    String
  headerUrl   String
  genres      String[]
  userGames   UserGame[]
  reviews     UserReview[]
}

model UserGame {
  id              String    @id @default(uuid())
  userId          String
  gameId          String
  playtimeMinutes Int
  playtime2Weeks  Int
  lastPlayedAt    DateTime?
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  game            Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  @@unique([userId, gameId])
}

model UserReview {
  id             String   @id @default(uuid())
  userId         String
  gameId         String
  content        String
  isRecommended  Boolean
  steamReviewId  String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game           Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
}

model AIAnalysis {
  id          String   @id @default(uuid())
  userId      String
  type        String   // personality | review_style | recommendation
  content     Json
  generatedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, type])
}
```

- [ ] **步骤 4：编写 Prisma 单例**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **步骤 5：生成数据库 client 并初始化**

```bash
npx prisma generate
```

- [ ] **步骤 6：配置 .env.example**

```bash
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minegamestats"
STEAM_API_KEY=""  # 可选，Steam Web API Key（不填则使用公开数据爬取）
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
SESSION_SECRET="generate-a-random-secret-at-least-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **步骤 7：编写根布局**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MineGameStats - Steam 游戏数据分析",
  description: "连接你的 Steam 账号，深度分析你的游戏人生",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **步骤 8：配置 .gitignore**

确保 `.env` 和 `node_modules/` 在 `.gitignore` 中。

- [ ] **步骤 9：类型定义**

```typescript
// src/types/index.ts
export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  img_logo_url: string;
  last_played?: number;
}

export interface PlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export interface GameWithPlaytime {
  id: string;
  steamAppId: number;
  name: string;
  coverUrl: string;
  headerUrl: string;
  genres: string[];
  playtimeMinutes: number;
  playtime2Weeks: number;
  lastPlayedAt: string | null;
}

export interface AIAnalysisResult {
  personality?: string;
  tags?: string[];
  summary?: string;
  recommendations?: { name: string; reason: string }[];
}
```

- [ ] **步骤 10：Commit**

```bash
git add . && git commit -m "chore: 初始化项目脚手架，配置 Prisma + Tailwind"
```

---

### 任务 2：Steam 认证

**目标：** 实现 Steam OpenID 登录流程，用 iron-session 管理登录状态。

**文件：**
- 创建：`src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/callback/route.ts`, `src/components/SteamLoginButton.tsx`
- 修改：`src/components/Header.tsx`

- [ ] **步骤 1：编写认证工具函数**

```typescript
// src/lib/auth.ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  cookieName: "minegamestats_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 天
  },
};

export interface SessionData {
  userId?: string;
  steamId?: string;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/");
  }
  return session;
}
```

- [ ] **步骤 2：编写 Steam OpenID 登录跳转**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

export async function GET(request: NextRequest) {
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl,
    "openid.realm": process.env.NEXT_PUBLIC_APP_URL!,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return NextResponse.redirect(`${STEAM_OPENID_URL}?${params}`);
}
```

- [ ] **步骤 3：编写 Steam OpenID 回调处理**

```typescript
// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function parseSteamId(url: string): string | null {
  const match = url.match(/\/id\/(\d+)$/);
  return match ? match[1] : null;
}

async function verifyOpenId(request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  const params = url.searchParams;

  if (params.get("openid.mode") !== "id_res") return null;

  // 回验证 Steam OpenID
  const verifyParams = new URLSearchParams(params as any);
  verifyParams.set("openid.mode", "check_authentication");

  const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    body: verifyParams,
  });
  const verifyText = await verifyRes.text();

  if (!verifyText.includes("is_valid:true")) return null;

  const claimedId = params.get("openid.claimed_id") ?? "";
  return parseSteamId(claimedId);
}

async function fetchPlayerSummary(steamId: string) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.response?.players?.[0] ?? null;
}

async function fetchPlayerSummaryNoApiKey(steamId: string) {
  const url = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
  const res = await fetch(url);
  const text = await res.text();

  const nameMatch = text.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
  const avatarMatch = text.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);

  return {
    steamid: steamId,
    personaname: nameMatch?.[1] ?? "Steam User",
    avatarfull: avatarMatch?.[1] ?? "",
    profileurl: `https://steamcommunity.com/profiles/${steamId}`,
  };
}

export async function GET(request: NextRequest) {
  const steamId = await verifyOpenId(request);
  if (!steamId) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }

  // 获取用户信息
  let player;
  if (process.env.STEAM_API_KEY) {
    player = await fetchPlayerSummary(steamId);
  }
  if (!player) {
    player = await fetchPlayerSummaryNoApiKey(steamId);
  }
  if (!player) {
    return NextResponse.redirect(new URL("/?error=profile_fetch_failed", request.url));
  }

  // 创建或更新用户
  const user = await db.user.upsert({
    where: { steamId },
    update: {
      displayName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl,
    },
    create: {
      steamId,
      displayName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl,
    },
  });

  // 设置 session
  const session = await getSession();
  session.userId = user.id;
  session.steamId = steamId;
  await session.save();

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

- [ ] **步骤 4：编写 Header 组件**

```tsx
// src/components/Header.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SteamLoginButton from "./SteamLoginButton";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-orange-500">
        MineGameStats
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/dashboard" className={pathname === "/dashboard" ? "text-orange-500" : "text-gray-400 hover:text-white"}>
          游戏库
        </Link>
        <Link href="/galaxy" className={pathname === "/galaxy" ? "text-orange-500" : "text-gray-400 hover:text-white"}>
          星系
        </Link>
        <Link href="/analysis" className={pathname === "/analysis" ? "text-orange-500" : "text-gray-400 hover:text-white"}>
          AI 锐评
        </Link>
        <Link href="/recommend" className={pathname === "/recommend" ? "text-orange-500" : "text-gray-400 hover:text-white"}>
          推荐
        </Link>
        <SteamLoginButton />
      </nav>
    </header>
  );
}
```

- [ ] **步骤 5：编写 Steam 登录按钮组件**

```tsx
// src/components/SteamLoginButton.tsx
"use client";
import { useEffect, useState } from "react";

export default function SteamLoginButton() {
  const [user, setUser] = useState<{ displayName?: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
        <span className="text-sm text-gray-300">{user.displayName}</span>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
    >
      连接 Steam
    </a>
  );
}
```

- [ ] **步骤 6：编写 Session API**

```typescript
// src/app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, displayName: true, avatarUrl: true },
  });

  return NextResponse.json({ user });
}
```

- [ ] **步骤 7：Commit**

```bash
git add . && git commit -m "feat: 实现 Steam OpenID 登录和 session 管理"
```

---

### 任务 3：Steam 游戏数据同步

**目标：** 从 Steam 公开页面抓取游戏库和评测数据，存入数据库。

**文件：**
- 创建：`src/lib/steam.ts`, `src/app/api/sync/route.ts`
- 修改：`src/app/api/auth/callback/route.ts`（登录后自动触发同步）

- [ ] **步骤 1：编写 Steam 数据抓取工具**

```typescript
// src/lib/steam.ts
import { db } from "./db";

interface RawSteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks: number;
  img_icon_url: string;
  img_logo_url: string;
  has_community_visible_stats?: boolean;
  last_played?: number;
}

// 游戏封面 URL 规则
function getCoverUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
}

function getHeaderUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

// 通过 Steam 公开页面获取游戏列表（无需 API Key）
export async function fetchOwnedGames(steamId: string): Promise<RawSteamGame[]> {
  const url = `https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();

  // 解析 XML
  const games: RawSteamGame[] = [];
  const gameRegex = /<game>([\s\S]*?)<\/game>/g;
  let match;

  while ((match = gameRegex.exec(text)) !== null) {
    const xml = match[1];
    const appid = parseInt(xml.match(/<appID>(\d+)<\/appID>/)?.[1] ?? "0");
    const name = xml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] ?? "";
    const playtime_forever = parseInt(xml.match(/<hoursOnRecord>(\d+(?:\.\d+)?)<\/hoursOnRecord>/)?.[1] ?? "0") * 60;
    const playtime_2weeks = parseInt(xml.match(/<hoursInLast2Weeks>(\d+(?:\.\d+)?)<\/hoursInLast2Weeks>/)?.[1] ?? "0") * 60;
    const img_icon_url = xml.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>/)?.[1] ?? "";
    const img_logo_url = xml.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>/)?.[1] ?? "";
    const last_played = xml.match(/<lastPlayed>(\d+)<\/lastPlayed>/)?.[1];

    if (appid > 0) {
      games.push({
        appid,
        name,
        playtime_forever: Math.round(playtime_forever),
        playtime_2weeks: Math.round(playtime_2weeks),
        img_icon_url,
        img_logo_url,
        last_played: last_played ? parseInt(last_played) : undefined,
      });
    }
  }

  return games;
}

// 获取游戏类型标签
export async function fetchGameGenres(appId: number): Promise<string[]> {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const res = await fetch(url);
    const json = await res.json();
    const data = json[appId]?.data;
    if (!data?.genres) return [];
    return data.genres.map((g: { description: string }) => g.description);
  } catch {
    return [];
  }
}

// 同步用户游戏库到数据库
export async function syncGameLibrary(userId: string, steamId: string): Promise<number> {
  const rawGames = await fetchOwnedGames(steamId);
  let synced = 0;

  for (const raw of rawGames) {
    // Upsert Game
    const game = await db.game.upsert({
      where: { steamAppId: raw.appid },
      update: {
        name: raw.name,
        coverUrl: getCoverUrl(raw.appid),
        headerUrl: getHeaderUrl(raw.appid),
      },
      create: {
        steamAppId: raw.appid,
        name: raw.name,
        coverUrl: getCoverUrl(raw.appid),
        headerUrl: getHeaderUrl(raw.appid),
        genres: [],
      },
    });

    // Upsert UserGame
    await db.userGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: {
        playtimeMinutes: raw.playtime_forever,
        playtime2Weeks: raw.playtime_2weeks,
        lastPlayedAt: raw.last_played ? new Date(raw.last_played * 1000) : null,
      },
      create: {
        userId,
        gameId: game.id,
        playtimeMinutes: raw.playtime_forever,
        playtime2Weeks: raw.playtime_2weeks,
        lastPlayedAt: raw.last_played ? new Date(raw.last_played * 1000) : null,
      },
    });

    synced++;
  }

  // 更新同步时间
  await db.user.update({ where: { id: userId }, data: { lastSyncAt: new Date() } });

  return synced;
}

// 获取用户评测
export async function fetchUserReviews(steamId: string) {
  const url = `https://steamcommunity.com/profiles/${steamId}/recommended/`;
  const res = await fetch(url);
  const text = await res.text();

  const reviews: { gameName: string; content: string; isRecommended: boolean; steamReviewId: string }[] = [];
  const reviewRegex = /<div class="recommendation_review"[^>]*>[\s\S]*?<div class="content">([\s\S]*?)<\/div>/g;
  let match;

  while ((match = reviewRegex.exec(text)) !== null) {
    const html = match[1];
    const contentMatch = html.match(/<div class="recommendation_desc">([\s\S]*?)<\/div>/);
    const titleMatch = html.match(/<a[^>]*>([^<]+)<\/a>/);
    const idMatch = html.match(/data-modal-content-url="[^"]*id=(\d+)"/);

    if (contentMatch && titleMatch) {
      reviews.push({
        gameName: titleMatch[1].trim(),
        content: contentMatch[1].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").trim(),
        isRecommended: !html.includes("Not Recommended"),
        steamReviewId: idMatch?.[1] ?? `review_${Date.now()}`,
      });
    }
  }

  return reviews;
}

// 同步评测到数据库
export async function syncReviews(userId: string, steamId: string) {
  const reviews = await fetchUserReviews(steamId);

  for (const review of reviews) {
    // 尝试匹配游戏
    const game = await db.game.findFirst({
      where: { name: review.gameName },
    });

    if (!game) continue;

    await db.userReview.upsert({
      where: { steamReviewId: review.steamReviewId },
      update: { content: review.content, isRecommended: review.isRecommended },
      create: {
        userId,
        gameId: game.id,
        content: review.content,
        isRecommended: review.isRecommended,
        steamReviewId: review.steamReviewId,
      },
    });
  }

  return reviews.length;
}
```

- [ ] **步骤 2：编写同步 API 路由**

```typescript
// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncGameLibrary, syncReviews } from "@/lib/steam";

export async function POST() {
  const session = await requireAuth();

  try {
    const gameCount = await syncGameLibrary(session.userId!, session.steamId!);
    const reviewCount = await syncReviews(session.userId!, session.steamId!);

    return NextResponse.json({ success: true, gameCount, reviewCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

- [ ] **步骤 3：登录后自动触发同步**

在 `src/app/api/auth/callback/route.ts` 末尾，设置 session 后调用：

```typescript
import { syncGameLibrary, syncReviews } from "@/lib/steam";

// 在 redirect 前异步同步（不阻塞登录）
syncGameLibrary(user.id, steamId).catch(console.error);
syncReviews(user.id, steamId).catch(console.error);
```

- [ ] **步骤 4：Commit**

```bash
git add . && git commit -m "feat: 实现 Steam 游戏库和评测数据同步"
```

---

### 任务 4：Dashboard — 游戏库展示

**目标：** 实现数据总览和游戏库列表页面，支持排序、筛选、搜索。

**文件：**
- 创建：`src/components/StatsOverview.tsx`, `src/components/GameCard.tsx`, `src/components/GameList.tsx`, `src/app/dashboard/page.tsx`

- [ ] **步骤 1：编写 Dashboard 页面（服务端组件获取数据）**

```tsx
// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import StatsOverview from "@/components/StatsOverview";
import GameList from "@/components/GameList";

export default async function DashboardPage({ searchParams }: { searchParams: { sort?: string; q?: string } }) {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const sort = searchParams.sort ?? "playtime";
  const query = searchParams.q ?? "";

  let orderBy: any = { playtimeMinutes: "desc" as const };
  if (sort === "recent") orderBy = { lastPlayedAt: "desc" as const };
  if (sort === "name") orderBy = { game: { name: "asc" as const } };

  const where: any = { userId: session.userId };
  if (query) {
    where.game = { name: { contains: query, mode: "insensitive" } };
  }

  const userGames = await db.userGame.findMany({
    where,
    include: { game: true },
    orderBy,
  });

  const totalGames = userGames.length;
  const totalMinutes = userGames.reduce((sum, ug) => sum + ug.playtimeMinutes, 0);
  const total2Weeks = userGames.reduce((sum, ug) => sum + ug.playtime2Weeks, 0);

  const games = userGames.map((ug) => ({
    id: ug.game.id,
    steamAppId: ug.game.steamAppId,
    name: ug.game.name,
    coverUrl: ug.game.coverUrl,
    headerUrl: ug.game.headerUrl,
    genres: ug.game.genres,
    playtimeMinutes: ug.playtimeMinutes,
    playtime2Weeks: ug.playtime2Weeks,
    lastPlayedAt: ug.lastPlayedAt?.toISOString() ?? null,
  }));

  // 收集所有类型标签用于筛选
  const allGenres = [...new Set(userGames.flatMap((ug) => ug.game.genres))].sort();

  // 获取用户信息
  const user = await db.user.findUnique({ where: { id: session.userId } });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <StatsOverview
        totalGames={totalGames}
        totalHours={Math.round(totalMinutes / 60)}
        total2Weeks={Math.round(total2Weeks / 60)}
        userName={user?.displayName ?? ""}
      />
      <GameList games={games} allGenres={allGenres} />
    </div>
  );
}
```

- [ ] **步骤 2：编写 StatsOverview 组件**

```tsx
// src/components/StatsOverview.tsx
export default function StatsOverview({
  totalGames, totalHours, total2Weeks, userName,
}: {
  totalGames: number; totalHours: number; total2Weeks: number; userName: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold mb-2">{userName} 的游戏库</h1>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{totalGames}</div>
          <div className="text-gray-400 text-sm">游戏总数</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{totalHours.toLocaleString()}h</div>
          <div className="text-gray-400 text-sm">总时长</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{total2Weeks}h</div>
          <div className="text-gray-400 text-sm">近两周</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 3：编写 GameCard 组件**

```tsx
// src/components/GameCard.tsx
import type { GameWithPlaytime } from "@/types";
import Link from "next/link";

export default function GameCard({ game }: { game: GameWithPlaytime }) {
  const hours = Math.round(game.playtimeMinutes / 60);
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden hover:ring-1 hover:ring-orange-500 transition">
      <img
        src={game.coverUrl}
        alt={game.name}
        className="w-full aspect-[3/4] object-cover"
        loading="lazy"
      />
      <div className="p-3">
        <h3 className="font-medium truncate">{game.name}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>{hours}h</span>
          {game.lastPlayedAt && (
            <span>{new Date(game.lastPlayedAt).toLocaleDateString("zh-CN")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：编写 GameList 组件（含排序、筛选、搜索）**

```tsx
// src/components/GameList.tsx
"use client";
import { useState } from "react";
import type { GameWithPlaytime } from "@/types";
import GameCard from "./GameCard";

export default function GameList({ games, allGenres }: { games: GameWithPlaytime[]; allGenres: string[] }) {
  const [sort, setSort] = useState("playtime");
  const [genre, setGenre] = useState("");
  const [search, setSearch] = useState("");

  let filtered = games;
  if (genre) filtered = filtered.filter((g) => g.genres.includes(genre));
  if (search) filtered = filtered.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  if (sort === "playtime") filtered.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
  if (sort === "recent") filtered.sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="搜索游戏..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="playtime">按游玩时长</option>
          <option value="recent">按最近游玩</option>
          <option value="name">按游戏名称</option>
        </select>
        <select
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">全部类型</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">没有找到匹配的游戏</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 5：Commit**

```bash
git add . && git commit -m "feat: 实现 Dashboard 游戏库展示，支持排序筛选搜索"
```

---

### 任务 5：星系视图 — 星球环绕封面可视化

**目标：** 用 Three.js 实现中心辐射式 3D 游戏封面展示。时长越长，离中心越近、封面越大。

**文件：**
- 创建：`src/components/GalaxyView.tsx`, `src/app/galaxy/page.tsx`

- [ ] **步骤 1：编写 Galaxy 页面**

```tsx
// src/app/galaxy/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import GalaxyView from "@/components/GalaxyView";

export default async function GalaxyPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const userGames = await db.userGame.findMany({
    where: { userId: session.userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const user = await db.user.findUnique({ where: { id: session.userId } });

  const planets: { id: string; name: string; coverUrl: string; playtimeHours: number }[] = userGames.map((ug) => ({
    id: ug.game.id,
    name: ug.game.name,
    coverUrl: ug.game.coverUrl,
    playtimeHours: Math.round(ug.playtimeMinutes / 60),
  }));

  return (
    <div className="h-[calc(100vh-57px)]">
      <GalaxyView planets={planets} centerAvatar={user?.avatarUrl ?? ""} />
    </div>
  );
}
```

- [ ] **步骤 2：编写 GalaxyView Three.js 组件**

```tsx
// src/components/GalaxyView.tsx
"use client";
import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

interface Planet {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

function CoverTexture({ url }: { url: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useMemo(() => {
    if (!url) return;
    new THREE.TextureLoader().load(url, setTexture, undefined, () => {});
  }, [url]);
  return texture ? <meshBasicMaterial map={texture} /> : <meshBasicMaterial color="#1a1a2e" />;
}

function PlanetMesh({ planet, angle, distance, scale }: { planet: Planet; angle: number; distance: number; scale: number }) {
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;

  return (
    <group position={[x, (Math.random() - 0.5) * 2, z]}>
      <Billboard>
        <mesh>
          <planeGeometry args={[scale, scale * 1.25]} />
          <CoverTexture url={planet.coverUrl} />
        </mesh>
        <Text
          position={[0, -scale * 0.7, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="top"
          maxWidth={scale * 2}
        >
          {planet.name}
        </Text>
        <Text
          position={[0, -scale * 0.9, 0]}
          fontSize={0.15}
          color="#ff6b35"
          anchorX="center"
          anchorY="top"
        >
          {planet.playtimeHours}h
        </Text>
      </Billboard>
    </group>
  );
}

function CenterSphere({ avatarUrl }: { avatarUrl: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useMemo(() => {
    if (!avatarUrl) return;
    new THREE.TextureLoader().load(avatarUrl, setTexture);
  }, [avatarUrl]);

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      {texture ? (
        <meshBasicMaterial map={texture} />
      ) : (
        <meshBasicMaterial color="#ff6b35" />
      )}
      <pointLight intensity={2} color="#ff6b35" distance={20} />
    </mesh>
  );
}

function GalaxyScene({ planets, centerAvatar }: { planets: Planet[]; centerAvatar: string }) {
  const maxHours = Math.max(...planets.map((p) => p.playtimeHours), 1);
  const minHours = Math.min(...planets.map((p) => p.playtimeHours), 1);

  return (
    <>
      <ambientLight intensity={0.3} />
      <CenterSphere avatarUrl={centerAvatar} />
      {planets.map((planet, i) => {
        // 时长映射：玩得越久，离中心越近，尺寸越大
        const t = maxHours === minHours ? 0.5 : (planet.playtimeHours - minHours) / (maxHours - minHours);
        const distance = 3 + (1 - t) * 10;  // 3~13 单位
        const scale = 0.4 + t * 1.6;          // 0.4~2.0
        const angle = (i / planets.length) * Math.PI * 2;

        return (
          <PlanetMesh
            key={planet.id}
            planet={planet}
            angle={angle}
            distance={distance}
            scale={scale}
          />
        );
      })}
    </>
  );
}

export default function GalaxyView({ planets, centerAvatar }: { planets: Planet[]; centerAvatar: string }) {
  return (
    <Canvas camera={{ position: [0, 5, 15], fov: 50 }} style={{ background: "#050510" }}>
      <OrbitControls enableZoom={true} enablePan={true} minDistance={3} maxDistance={40} autoRotate autoRotateSpeed={0.3} />
      <GalaxyScene planets={planets} centerAvatar={centerAvatar} />
    </Canvas>
  );
}
```

- [ ] **步骤 3：Commit**

```bash
git add . && git commit -m "feat: 实现星系视图 3D 封面可视化"
```

---

### 任务 6：AI 锐评 + 评测分析

**目标：** 调用 DeepSeek API，基于游戏库和评测生成玩家分析。页面支持切换"性格锐评"和"评测分析"Tab。

**文件：**
- 创建：`src/lib/deepseek.ts`, `src/app/api/analysis/route.ts`, `src/components/AnalysisCard.tsx`, `src/app/analysis/page.tsx`

- [ ] **步骤 1：编写 DeepSeek API 客户端**

```typescript
// src/lib/deepseek.ts
export async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的游戏玩家分析师，擅长根据游戏数据给出深度、有趣、毒舌中带洞察的玩家分析。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export function buildPersonalityPrompt(games: { name: string; hours: number; playtime2Weeks: number; lastPlayed: string | null; genres: string[] }[]): string {
  const gamesJson = JSON.stringify(games.slice(0, 50).map(g => ({
    name: g.name,
    hours: g.hours,
    recently: g.playtime2Weeks > 0 ? `${g.playtime2Weeks}h` : "近期未玩",
    last_played: g.lastPlayed ?? "未知",
    genres: g.genres,
  })), null, 2);

  return `以下是一个Steam玩家的游戏库数据（部分），请根据这些数据分析玩家的游戏偏好和性格特点。要求：
1. 分析游戏类型偏好，指出他最爱的游戏类型
2. 分析游玩时间分配模式，指出是否存在"买了不玩"或"沉迷单一游戏"的倾向
3. 给出3-5个性格标签（如"RPG重度患者"、"喜加一收藏家"、"硬核魂系受苦者"）
4. 一段2-3句话的毒舌精辟总结
5. 整体风格：理性分析为主，适当穿插幽默吐槽金句

游戏数据：
${gamesJson}

请用中文回复，使用Markdown格式，分节输出。`;
}

export function buildReviewStylePrompt(reviews: { gameName: string; content: string; isRecommended: boolean }[]): string {
  if (reviews.length === 0) return "该玩家暂未在 Steam 上写过任何评测。";

  const reviewsJson = JSON.stringify(reviews.slice(0, 20).map(r => ({
    game: r.gameName,
    recommend: r.isRecommended ? "推荐" : "不推荐",
    review: r.content.slice(0, 200),
  })), null, 2);

  return `以下是这个Steam玩家的游戏评测列表，请分析他的评价风格和偏好倾向。要求：
1. 分析他的评价语言风格（理性客观 / 感性情绪化 / 幽默吐槽 / 硬核分析向）
2. 总结他喜欢和不喜欢的游戏特征
3. 给出3-5个评测风格标签
4. 一段辛辣总结
5. 用中文回复，Markdown格式

评测数据：
${reviewsJson}`;
}
```

- [ ] **步骤 2：编写 AI 分析 API 路由**

```typescript
// src/app/api/analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { callDeepSeek, buildPersonalityPrompt, buildReviewStylePrompt } from "@/lib/deepseek";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const { type }: { type: "personality" | "review_style" } = await request.json();

  // 检查缓存（24h 内不重新生成）
  if (type !== "recommendation") {
    const cached = await db.aIAnalysis.findUnique({
      where: { userId_type: { userId: session.userId!, type } },
    });
    if (cached && Date.now() - new Date(cached.generatedAt).getTime() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ result: cached.content, cached: true });
    }
  }

  let prompt: string;

  if (type === "personality") {
    const userGames = await db.userGame.findMany({
      where: { userId: session.userId! },
      include: { game: true },
      orderBy: { playtimeMinutes: "desc" },
    });

    const games = userGames.map((ug) => ({
      name: ug.game.name,
      hours: Math.round(ug.playtimeMinutes / 60),
      playtime2Weeks: Math.round(ug.playtime2Weeks / 60),
      lastPlayed: ug.lastPlayedAt?.toISOString().split("T")[0] ?? null,
      genres: ug.game.genres,
    }));

    prompt = buildPersonalityPrompt(games);
  } else {
    const reviews = await db.userReview.findMany({
      where: { userId: session.userId! },
      include: { game: true },
    });

    const reviewData = reviews.map((r) => ({
      gameName: r.game.name,
      content: r.content,
      isRecommended: r.isRecommended,
    }));

    prompt = buildReviewStylePrompt(reviewData);
  }

  const result = await callDeepSeek(prompt);

  // 缓存结果
  await db.aIAnalysis.upsert({
    where: { userId_type: { userId: session.userId!, type } },
    update: { content: { text: result, generatedAt: new Date().toISOString() }, generatedAt: new Date() },
    create: { userId: session.userId!, type, content: { text: result } },
  });

  return NextResponse.json({ result: { text: result }, cached: false });
}
```

- [ ] **步骤 3：编写 AnalysisCard 组件**

```tsx
// src/components/AnalysisCard.tsx
"use client";

export default function AnalysisCard({
  content, loading, onRefresh,
}: {
  content: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="animate-pulse text-gray-400">AI 正在分析你的游戏数据...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">还没有分析结果</p>
        <button onClick={onRefresh} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition">
          开始分析
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="prose prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
      <div className="mt-6 text-center">
        <button onClick={onRefresh} className="text-sm text-gray-500 hover:text-orange-500 transition">
          刷新分析
        </button>
      </div>
    </div>
  );
}

// 简单 Markdown 转 HTML
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3 class='text-lg font-bold mt-6 mb-2 text-orange-400'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-xl font-bold mt-8 mb-3 text-orange-500'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mt-8 mb-4 text-orange-500'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-orange-300'>$1</strong>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 text-gray-300'>$1</li>")
    .replace(/\n\n/g, "</p><p class='text-gray-300 leading-relaxed mb-3'>")
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith("<")) return line;
      return `<p class='text-gray-300 leading-relaxed mb-3'>${line}</p>`;
    });
}
```

- [ ] **步骤 4：编写 Analysis 页面**

```tsx
// src/app/analysis/page.tsx
"use client";
import { useState, useEffect } from "react";
import AnalysisCard from "@/components/AnalysisCard";

export default function AnalysisPage() {
  const [tab, setTab] = useState<"personality" | "review_style">("personality");
  const [data, setData] = useState<{ personality: string | null; review_style: string | null }>({
    personality: null,
    review_style: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async (type: "personality" | "review_style") => {
    setLoading(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      setData((prev) => ({ ...prev, [type]: json.result.text }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => fetchAnalysis(tab);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI 玩家分析</h1>

      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg text-sm transition ${tab === "personality" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          onClick={() => setTab("personality")}
        >
          玩家性格锐评
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm transition ${tab === "review_style" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          onClick={() => setTab("review_style")}
        >
          评测风格分析
        </button>
      </div>

      <AnalysisCard
        content={data[tab]}
        loading={loading}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
```

- [ ] **步骤 5：Commit**

```bash
git add . && git commit -m "feat: 实现 DeepSeek AI 玩家锐评和评测风格分析"
```

---

### 任务 7：智能游戏推荐

**目标：** 规则初筛 5 个候选 + DeepSeek 精排并给出推荐理由。

**文件：**
- 创建：`src/lib/recommend.ts`, `src/components/RecommendCard.tsx`, `src/app/recommend/page.tsx`

- [ ] **步骤 1：编写推荐算法**

```typescript
// src/lib/recommend.ts
import { db } from "./db";
import { callDeepSeek } from "./deepseek";

export async function getCandidates(userId: string) {
  const userGames = await db.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const allGames = userGames.map((ug) => ({
    id: ug.game.id,
    name: ug.game.name,
    genres: ug.game.genres,
    playtimeMinutes: ug.playtimeMinutes,
    playtime2Weeks: ug.playtime2Weeks,
    lastPlayedAt: ug.lastPlayedAt?.toISOString() ?? null,
  }));

  // 规则 1: 找近两周在玩但不超过 100 小时的游戏（可能还在推进中）
  const recentlyPlayed = allGames.filter((g) => g.playtime2Weeks > 0 && g.playtimeMinutes < 6000);

  // 规则 2: 找时长超过 10 小时但近两周没玩的（可能搁置了）
  const stalled = allGames.filter((g) => g.playtime2Weeks === 0 && g.playtimeMinutes > 600);

  // 规则 3: 找玩了 2-10 小时就停的（浅尝辄止）
  const barelyPlayed = allGames.filter((g) => g.playtimeMinutes > 120 && g.playtimeMinutes < 600 && g.playtime2Weeks === 0);

  // 合并候选，优先推荐"搁置"和"浅尝"的
  const candidates = [...stalled.slice(0, 2), ...barelyPlayed.slice(0, 2), ...recentlyPlayed.slice(0, 1)].slice(0, 5);

  // 如果候选不足 5 个，用时长最高的补足
  if (candidates.length < 5) {
    const existing = new Set(candidates.map((c) => c.name));
    const remaining = allGames.filter((g) => !existing.has(g.name));
    candidates.push(...remaining.slice(0, 5 - candidates.length));
  }

  return { candidates, allGames };
}

export async function getRecommendations(userId: string) {
  const { candidates, allGames } = await getCandidates(userId);

  const prompt = `以下是玩家的游戏库概况和 5 个候选推荐游戏。请为每个候选游戏写一段个性化推荐理由（考虑游玩历史和偏好），并按推荐优先级排序。给每个推荐打分（1-10分）。

玩家游戏概况：
${JSON.stringify(allGames.slice(0, 20).map(g => ({ name: g.name, hours: Math.round(g.playtimeMinutes / 60), genres: g.genres, recently: g.playtime2Weeks > 0 ? "正在玩" : "搁置中" })), null, 2)}

候选推荐：
${JSON.stringify(candidates.map(c => ({ name: c.name, hours: Math.round(c.playtimeMinutes / 60), genres: c.genres })), null, 2)}

请用中文回复，JSON格式：{"recommendations": [{"name": "游戏名", "score": 9, "reason": "推荐理由（1-2句话）"}]}`;

  const result = await callDeepSeek(prompt);
  try {
    const json = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return json.recommendations ?? [];
  } catch {
    return candidates.map((c) => ({ name: c.name, score: 7, reason: "根据你的游戏偏好推荐" }));
  }
}
```

- [ ] **步骤 2：编写 RecommendCard 组件**

```tsx
// src/components/RecommendCard.tsx
interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl?: string;
}

export default function RecommendCard({ item, index }: { item: RecommendItem; index: number }) {
  const scoreColor = item.score >= 8 ? "text-green-400" : item.score >= 6 ? "text-yellow-400" : "text-gray-400";

  return (
    <div className="bg-gray-900 rounded-lg p-5 flex gap-4 hover:ring-1 hover:ring-orange-500 transition">
      <div className="text-3xl font-bold text-gray-700 flex items-center">#{index + 1}</div>
      {item.coverUrl && (
        <img src={item.coverUrl} alt={item.name} className="w-16 h-20 object-cover rounded" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">{item.name}</h3>
          <span className={`text-sm font-bold ${scoreColor}`}>{item.score}/10</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">{item.reason}</p>
      </div>
    </div>
  );
}
```

- [ ] **步骤 3：编写 Recommend 页面**

```tsx
// src/app/recommend/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommend";
import { db } from "@/lib/db";
import RecommendClient from "./RecommendClient";

export default async function RecommendPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const recommendations = await getRecommendations(session.userId);

  // 匹配封面
  const enriched = await Promise.all(
    recommendations.map(async (r: any) => {
      const game = await db.game.findFirst({ where: { name: r.name } });
      return { ...r, coverUrl: game?.coverUrl ?? "" };
    })
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">为你推荐</h1>
      <p className="text-gray-400 mb-6">基于你的游戏库和近期游玩习惯，AI 为你精选</p>
      <RecommendClient initialRecommendations={enriched} />
    </div>
  );
}
```

```tsx
// src/app/recommend/RecommendClient.tsx
"use client";
import { useState } from "react";
import RecommendCard from "@/components/RecommendCard";

interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl?: string;
}

export default function RecommendClient({ initialRecommendations }: { initialRecommendations: RecommendItem[] }) {
  const [items] = useState<RecommendItem[]>(initialRecommendations);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendItem[]>(initialRecommendations);

  const handleRefresh = async () => {
    setLoading(true);
    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recommendation" }),
    });
    const json = await res.json();
    setRecommendations(json.recommendations ?? []);
    setLoading(false);
  };

  return (
    <div>
      <div className="space-y-3">
        {recommendations.map((item, i) => (
          <RecommendCard key={item.name} item={item} index={i} />
        ))}
      </div>
      <div className="mt-6 text-center">
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-orange-500 transition disabled:opacity-50"
        >
          {loading ? "生成中..." : "换一批推荐"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：Commit**

```bash
git add . && git commit -m "feat: 实现 AI 智能游戏推荐"
```

---

### 任务 8：首页（Landing Page）

**目标：** 实现对外展示的项目首页，吸引用户登录。

**文件：**
- 修改：`src/app/page.tsx`

- [ ] **步骤 1：编写首页**

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-5xl font-bold mb-4">
        <span className="text-orange-500">Mine</span>
        <span className="text-white">Game</span>
        <span className="text-orange-500">Stats</span>
      </h1>
      <p className="text-xl text-gray-400 mb-2">连接你的 Steam 账号，深度分析你的游戏人生</p>
      <p className="text-gray-600 mb-8 max-w-lg">
        游戏库可视化 · AI 性格锐评 · 评测风格分析 · 智能游戏推荐
      </p>

      <Link
        href="/api/auth/login"
        className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition transform hover:scale-105"
      >
        连接 Steam 开始分析
      </Link>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
        <div className="bg-gray-900 rounded-xl p-6 text-left">
          <div className="text-3xl mb-3">🔗</div>
          <h3 className="font-bold mb-2">一键连接</h3>
          <p className="text-gray-400 text-sm">通过 Steam 安全登录，无需注册，即刻分析你的游戏库</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 text-left">
          <div className="text-3xl mb-3">🤖</div>
          <h3 className="font-bold mb-2">AI 锐评</h3>
          <p className="text-gray-400 text-sm">DeepSeek AI 分析你的游戏偏好，给出毒舌中带着洞察的锐评</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 text-left">
          <div className="text-3xl mb-3">🌌</div>
          <h3 className="font-bold mb-2">星系视图</h3>
          <p className="text-gray-400 text-sm">3D 可视化你的游戏库，封面像行星环绕，时长越大越接近中心</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add . && git commit -m "feat: 实现首页 Landing Page"
```

---

### 任务 9：Docker 部署配置

**目标：** Dockerfile + docker-compose.yml，一键部署。

**文件：**
- 创建：`Dockerfile`, `docker-compose.yml`, `README.md`

- [ ] **步骤 1：编写 Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "npx prisma db push && node server.js"]
```

- [ ] **步骤 2：配置 Next.js standalone 输出**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ hostname: "cdn.cloudflare.steamstatic.com" }, { hostname: "avatars.steamstatic.com" }],
  },
};
module.exports = nextConfig;
```

- [ ] **步骤 3：编写 docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres}@db:5432/minegamestats
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL:-https://api.deepseek.com}
      - STEAM_API_KEY=${STEAM_API_KEY:-}
      - SESSION_SECRET=${SESSION_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD:-postgres}
      - POSTGRES_DB=minegamestats
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **步骤 4：编写 README.md**

```markdown
# MineGameStats

连接 Steam 账号，深度分析你的游戏人生。

## 功能

- Steam 一键登录
- 游戏库可视化展示
- 3D 星系视图（游戏封面环绕）
- AI 玩家性格锐评
- AI 评测风格分析
- 智能游戏推荐

## 快速开始

### 前提

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 部署

1. 克隆项目：
```bash
git clone https://github.com/<your-org>/mine-game-stats.git
cd mine-game-stats
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 填入你的 DeepSeek API Key 和 SESSION_SECRET
```

3. 启动：
```bash
docker-compose up -d
```

4. 打开浏览器访问 `http://localhost:3000`

### 获取 DeepSeek API Key

1. 访问 [platform.deepseek.com](https://platform.deepseek.com/)
2. 注册账号并充值（最低 ¥1）
3. 在 API Keys 页面创建 Key
4. 填入 `.env` 的 `DEEPSEEK_API_KEY`

## 技术栈

- Next.js 14 + TypeScript
- Prisma + PostgreSQL
- Three.js (3D 可视化)
- DeepSeek API (AI 分析)
- Docker Compose
```

- [ ] **步骤 5：Commit**

```bash
git add . && git commit -m "feat: 添加 Docker 部署配置和 README"
```

---

### 任务 10：全局 Loading 和错误处理

**目标：** 添加 LoadingSpinner 组件和基础错误边界。

**文件：**
- 创建：`src/components/LoadingSpinner.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`

- [ ] **步骤 1：编写 LoadingSpinner**

```tsx
// src/components/LoadingSpinner.tsx
export default function LoadingSpinner({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm mt-3">{text}</p>
    </div>
  );
}
```

- [ ] **步骤 2：编写全局 loading.tsx**

```tsx
// src/app/loading.tsx
import LoadingSpinner from "@/components/LoadingSpinner";
export default function Loading() {
  return <LoadingSpinner />;
}
```

- [ ] **步骤 3：编写全局 error.tsx**

```tsx
// src/app/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold mb-2">出了点问题</h2>
      <p className="text-gray-400 text-sm mb-4">{error.message}</p>
      <button onClick={reset} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
        重试
      </button>
    </div>
  );
}
```

- [ ] **步骤 4：Commit**

```bash
git add . && git commit -m "feat: 添加 Loading 和错误处理"
```

---

## 实现顺序

1. 任务 1 → 脚手架
2. 任务 2 → Steam 认证
3. 任务 3 → 数据同步
4. 任务 4 → Dashboard
5. 任务 5 → 星系视图
6. 任务 6 → AI 分析
7. 任务 7 → 推荐
8. 任务 8 → 首页
9. 任务 9 → Docker 部署
10. 任务 10 → 收尾
