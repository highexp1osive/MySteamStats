const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的游戏玩家分析师，擅长根据游戏数据给出深度、有趣、毒舌中带洞察的玩家分析。使用中文回复。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export function buildPersonalityPrompt(
  games: { name: string; hours: number; playtime2Weeks: number; lastPlayed: string | null; genres: string[] }[]
): string {
  // Exclude non-game apps (tools, benchmarks, etc.)
  const isNonGame = (name: string, genres: string[]) => {
    const nonGameNames = ["wallpaper engine", "3dmark", "pc building simulator", "cpu-z", "gpu-z"];
    if (nonGameNames.some((n) => name.toLowerCase().includes(n)) && genres.length === 0) return true;
    return false;
  };
  const gameList = games.filter((g) => !isNonGame(g.name, g.genres));

  const data = gameList.map((g) => ({
    name: g.name,
    hours: g.hours,
    recently: g.playtime2Weeks > 0 ? `${g.playtime2Weeks}h` : "近期未玩",
    last_played: g.lastPlayed ?? "未知",
    genres: g.genres,
  }));

  return `以下是一个Steam玩家的完整游戏库数据（按游玩时长排序，共${gameList.length}款，已排除Wallpaper Engine等工具软件），请分析玩家的游戏偏好和性格特点。

要求：
1. 分析游戏类型偏好，指出他最爱的游戏类型
2. 分析游玩时间分配模式，指出是否存在"买了不玩"或"沉迷单一游戏"的倾向
3. 给出3-5个性格标签（如"RPG重度患者"、"喜加一收藏家"、"硬核魂系受苦者"）
4. 一段2-3句话的毒舌精辟总结
5. 整体风格：理性分析为主，适当穿插幽默吐槽金句

游戏数据：
${JSON.stringify(data, null, 2)}

请用中文回复，使用Markdown格式，分节输出。`;
}

export function buildReviewStylePrompt(
  reviews: { gameName: string; content: string; isRecommended: boolean }[]
): string {
  if (reviews.length === 0) return "";

  const data = reviews.slice(0, 20).map((r) => ({
    game: r.gameName,
    recommend: r.isRecommended ? "推荐" : "不推荐",
    review: r.content.slice(0, 200),
  }));

  return `以下是这个Steam玩家的游戏评测列表，请分析他的评价风格和偏好倾向。

要求：
1. 分析他的评价语言风格（理性客观 / 感性情绪化 / 幽默吐槽 / 硬核分析向）
2. 总结他喜欢和不喜欢的游戏特征
3. 给出3-5个评测风格标签
4. 一段辛辣总结

评测数据：
${JSON.stringify(data, null, 2)}

请用中文回复，Markdown格式。`;
}
