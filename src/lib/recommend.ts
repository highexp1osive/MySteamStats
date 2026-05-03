import { db } from "./db";
import { callDeepSeek } from "./deepseek";

type Mode = "backlog" | "continue_playing";

export interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl: string | null;
  inLibrary: boolean;
  appId: number | null;
}

async function getLibraryCandidates(userId: string, mode: Mode) {
  const all = await db.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const games = all.map((ug) => ({
    name: ug.game.name,
    steamAppId: ug.game.steamAppId,
    hours: Math.round(ug.playtimeMinutes / 60),
    recentHours: Math.round(ug.playtime2Weeks / 60),
    lastPlayed: ug.lastPlayedAt?.toISOString() ?? null,
    genres: ug.game.genres,
    coverUrl: ug.game.coverUrl,
  }));

  if (mode === "backlog") {
    // Games bought but barely played, or played then abandoned
    const barelyPlayed = games.filter((g) => g.hours > 0 && g.hours < 10 && g.recentHours === 0);
    const abandoned = games.filter((g) => g.hours >= 10 && g.recentHours === 0);
    return [...barelyPlayed.slice(0, 3), ...abandoned.slice(0, 7)].slice(0, 12);
  }

  // continue_playing: games played a lot and possibly recently
  const recentlyPlayed = games.filter((g) => g.recentHours > 0);
  const mostPlayed = games.filter((g) => g.hours >= 20 && g.recentHours === 0);
  return [...recentlyPlayed.slice(0, 5), ...mostPlayed.slice(0, 5)].slice(0, 12);
}

function buildPrompt(libraryCandidates: ReturnType<typeof getLibraryCandidates> extends Promise<infer T> ? T : never, mode: Mode, allGames: { name: string; hours: number; genres: string[] }[]) {
  const modeDesc = mode === "backlog"
    ? "优先推荐买了但没怎么玩的游戏（清 backlog），帮助玩家发现库里被遗忘的宝藏"
    : "优先推荐玩得多但最近没碰的游戏，帮助玩家重拾旧爱、继续沉迷";

  return `你是一个专业的游戏推荐顾问。根据以下Steam玩家的游戏库数据，请推荐游戏。

推荐模式：${modeDesc}

玩家游戏库概况（部分）：
${JSON.stringify(allGames.slice(0, 30).map(g => ({ name: g.name, hours: g.hours, genres: g.genres })), null, 2)}

库内候选游戏：
${JSON.stringify(libraryCandidates.slice(0, 8), null, 2)}

要求：
1. 从库内候选中选出 3-5 个最值得推荐的游戏，给出推荐理由和评分（1-10）
2. 根据玩家的游戏偏好，推荐 2-3 个库外的 Steam 热门游戏（玩家库里没有的），给出推荐理由
3. 每个推荐的评分要合理区分，不要全部高分

请用中文回复，JSON格式：
{"recommendations": [{"name": "游戏名", "score": 9, "reason": "推荐理由（1-2句话）", "inLibrary": true, "steamAppId": 12345}]}

注意：inLibrary=true 表示游戏在库里，false 表示库外推荐。库外推荐的 steamAppId 可以填 0。`;
}

export async function getRecommendations(userId: string, mode: Mode = "backlog"): Promise<RecommendItem[]> {
  // Get full library for context
  const allGames = await db.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const gameList = allGames.map((ug) => ({
    name: ug.game.name,
    hours: Math.round(ug.playtimeMinutes / 60),
    genres: ug.game.genres,
    steamAppId: ug.game.steamAppId,
    coverUrl: ug.game.coverUrl,
  }));

  const libraryCandidates = await getLibraryCandidates(userId, mode);

  const prompt = buildPrompt(libraryCandidates, mode, gameList);
  const result = await callDeepSeek(prompt);

  try {
    const match = result.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { recommendations: [] };
    const items: RecommendItem[] = (json.recommendations ?? []).map((r: any) => {
      // Try to find cover for in-library games
      let coverUrl: string | null = null;
      let appId: number | null = null;
      if (r.inLibrary && r.steamAppId) {
        const found = gameList.find((g) => g.steamAppId === r.steamAppId);
        if (found) { coverUrl = found.coverUrl; appId = found.steamAppId; }
      }
      // For out-of-library, try DB first
      if (!r.inLibrary && r.name) {
        const found = gameList.find((g) => g.name === r.name);
        if (found) { coverUrl = found.coverUrl; appId = found.steamAppId; }
      }
      return { name: r.name, score: r.score ?? 7, reason: r.reason ?? "", coverUrl, inLibrary: r.inLibrary ?? true, appId };
    });

    return items;
  } catch {
    // Fallback: simple recommendations from library
    return libraryCandidates.slice(0, 5).map((g: any) => ({
      name: g.name,
      score: 7,
      reason: g.recentHours > 0 ? "你最近在玩，继续推进吧" : "是时候捡起来了",
      coverUrl: g.coverUrl,
      inLibrary: true,
      appId: g.steamAppId,
    }));
  }
}
