import { db } from "./db";
import { callDeepSeek } from "./deepseek";
import { fetchWithProxy } from "./fetch-with-proxy";

type Mode = "backlog" | "continue_playing";

export interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl: string | null;
  inLibrary: boolean;
  appId: number | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Exclude non-game tools from recommendations and analysis
const NON_GAME_NAMES = ["wallpaper engine", "3dmark", "pc building simulator", "cpu-z", "gpu-z"];

function isNonGameApp(name: string): boolean {
  return NON_GAME_NAMES.some((n) => name.toLowerCase().includes(n));
}

async function getLibraryCandidates(userId: string, mode: Mode) {
  const all = await db.userGame.findMany({
    where: { userId, completed: false },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const games = all
    .filter((ug) => !isNonGameApp(ug.game.name))
    .map((ug) => ({
    name: ug.game.name,
    steamAppId: ug.game.steamAppId,
    hours: Math.round(ug.playtimeMinutes / 60),
    recentHours: Math.round(ug.playtime2Weeks / 60),
    genres: ug.game.genres,
    coverUrl: ug.game.coverUrl,
  }));

  if (mode === "backlog") {
    const neverPlayed = games.filter((g) => g.hours === 0);
    const barelyPlayed = games.filter((g) => g.hours > 0 && g.hours < 10 && g.recentHours === 0);
    const abandoned = games.filter((g) => g.hours >= 10 && g.recentHours === 0);
    return [
      ...shuffle(neverPlayed).slice(0, 10),
      ...shuffle(barelyPlayed).slice(0, 10),
      ...shuffle(abandoned).slice(0, 10),
    ].slice(0, 30);
  }

  const recentlyPlayed = games.filter((g) => g.recentHours > 0);
  const mostPlayed = games.filter((g) => g.hours >= 20 && g.recentHours === 0);
  return shuffle([...shuffle(recentlyPlayed).slice(0, 8), ...shuffle(mostPlayed).slice(0, 8)]).slice(0, 20);
}

// Search Steam store for a game by name, return appId and cover
async function searchSteamStore(gameName: string): Promise<{ appId: number; coverUrl: string } | null> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=schinese&cc=cn`;
    const res = await fetchWithProxy(url, 8000);
    if (!res.ok) return null;
    const json = await res.json();
    const item = json.items?.[0];
    if (!item?.id) return null;
    return {
      appId: item.id,
      coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/library_600x900_2x.jpg`,
    };
  } catch {
    return null;
  }
}

export async function getRecommendations(userId: string, mode: Mode = "backlog"): Promise<RecommendItem[]> {
  const allGames = await db.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const gameList = allGames.map((ug) => ({
    name: ug.game.name,
    nameLower: ug.game.name.toLowerCase(),
    hours: Math.round(ug.playtimeMinutes / 60),
    genres: ug.game.genres,
    steamAppId: ug.game.steamAppId,
    coverUrl: ug.game.coverUrl,
  }));

  const libraryNames = new Set(gameList.map((g) => g.nameLower));
  const allNames = gameList.map((g) => g.name).join("、");

  // Get completed game names for exclusion in prompt
  const completedGames = await db.userGame.findMany({
    where: { userId, completed: true },
    include: { game: true },
  });
  const completedNames = new Set(completedGames.map((ug) => ug.game.name));

  const libraryCandidates = await getLibraryCandidates(userId, mode);

  const prompt = `你是一个专业的游戏推荐顾问。以下是玩家的完整游戏库名称列表（共${gameList.length}款）：

${allNames}

推荐模式：${mode === "backlog" ? "清 backlog —— 只推荐库里时长较短或根本没打开过的游戏，帮玩家清理库存" : "继续沉迷 —— 优先推荐玩得多但最近没碰的游戏，同时推荐库外类似的热门游戏"}

${completedNames.size > 0 ? `玩家已标记通关的游戏（不要推荐）：${Array.from(completedNames).join("、")}` : ""}

重要规则：
- 竞争性多人网游(如CS2/PUBG/Dota2/Apex/Valorant/彩虹六号/守望先锋等)没有通关概念,玩得再多也不代表完成。清backlog时不要推荐这类游戏。
- 判断游戏是否有通关概念:看类型标签。有剧情/单机/冒险/RPG/动作/独立等标签通常有通关概念。只有多人/竞技/FPS/大逃杀/MOBA等标签的游戏没有通关。

库内候选（随机抽取，共${libraryCandidates.length}款）：
${JSON.stringify(libraryCandidates.map(g => ({ name: g.name, hours: g.hours, genres: g.genres })), null, 2)}

要求：
${mode === "backlog"
  ? "1. 从上面候选列表中选6-8个推荐。优先推荐有通关概念的单机游戏。排除纯多人竞技游戏。\n2. 不要推荐任何库外游戏，全部推荐必须来自候选列表\n3. 评分合理区分"
  : "1. 从库内候选中选出3-4个推荐，给出理由和评分(1-10)\n2. 再推荐3-4个库外Steam热门游戏\n3. 仔细核对上面的完整游戏名单：如果游戏名出现在完整名单中，inLibrary必须为true\n4. 评分合理区分"}

JSON格式回复（inLibrary的判断标准：游戏名出现在上面完整游戏名单中=true，不在名单中=false）：
{"recommendations": [{"name": "游戏英文名", "score": 9, "reason": "1-2句推荐理由", "inLibrary": true}]}`;

  const result = await callDeepSeek(prompt);

  try {
    // Extract JSON: try markdown code block first, then raw match
    let jsonStr = "";
    const codeMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      jsonStr = codeMatch[1].trim();
    } else {
      const m = result.match(/\{[\s\S]*\}/);
      jsonStr = m ? m[0] : "";
    }
    const json = JSON.parse(jsonStr || "{}");
    const rawItems: any[] = json.recommendations ?? [];

    const items: RecommendItem[] = [];

    for (const r of rawItems) {
      // Force inLibrary=true if the game is in user's library (exact match)
      const nameLower = (r.name ?? "").toLowerCase();
      const foundInLib = libraryNames.has(nameLower);
      const inLibrary = foundInLib || (r.inLibrary === true);

      const dbGame = await db.game.findFirst({
        where: { name: { contains: r.name, mode: "insensitive" } },
      });

      let coverUrl: string | null = dbGame?.coverUrl ?? null;
      let appId: number | null = dbGame?.steamAppId ?? null;

      // If out of library and no cover in DB, search Steam store
      if (!coverUrl && !inLibrary) {
        const storeResult = await searchSteamStore(r.name);
        if (storeResult) {
          coverUrl = storeResult.coverUrl;
          appId = storeResult.appId;
        }
      }
      // If found in library, always use library data
      if (foundInLib) {
        const userGame = gameList.find((g) => g.nameLower === nameLower);
        if (userGame) { coverUrl = userGame.coverUrl; appId = userGame.steamAppId; }
      }

      items.push({
        name: r.name,
        score: r.score ?? 7,
        reason: r.reason ?? "",
        coverUrl,
        inLibrary,
        appId,
      });
    }

    return items;
  } catch (e) {
    console.error("Recommend parse error:", e);
    // Fallback: simple rule-based recommendations
    return libraryCandidates.slice(0, 8).map((g: any, i: number) => {
      const reasons = [
        "玩了这么久却搁置了，是时候重温经典",
        "刚开始就放下，里面还有很多内容等你探索",
        "最近没碰，何不再开一局？",
        "你投入了不少时间，继续推进主线吧",
        "一直没深入玩，这个周末可以试试",
      ];
      return {
        name: g.name, score: 7 + (i % 3),
        reason: g.recentHours > 0 ? "最近在玩，保持势头！" : reasons[i % reasons.length],
        coverUrl: g.coverUrl, inLibrary: true, appId: g.steamAppId,
      };
    });
  }
}
