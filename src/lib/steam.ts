import { db } from "./db";
import { fetchWithProxy } from "./fetch-with-proxy";

function coverUrl(appId: number) {
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
}

function headerUrl(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

interface SteamApiGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks: number;
  rtime_last_played?: number;
}

async function fetchOwnedGames(steamId: string): Promise<SteamApiGame[]> {
  const key = process.env.STEAM_API_KEY;
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${key}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;

  const res = await fetchWithProxy(url, 15000);
  const json = await res.json();

  return (json.response?.games ?? []).map((g: any) => ({
    appid: g.appid,
    name: g.name ?? `App ${g.appid}`,
    playtime_forever: g.playtime_forever ?? 0,
    playtime_2weeks: g.playtime_2weeks ?? 0,
    rtime_last_played: g.rtime_last_played,
  }));
}

export async function syncGameLibrary(userId: string, steamId: string) {
  const games = await fetchOwnedGames(steamId);
  let count = 0;

  for (const g of games) {
    const game = await db.game.upsert({
      where: { steamAppId: g.appid },
      update: { name: g.name, coverUrl: coverUrl(g.appid), headerUrl: headerUrl(g.appid) },
      create: {
        steamAppId: g.appid, name: g.name,
        coverUrl: coverUrl(g.appid), headerUrl: headerUrl(g.appid), genres: [],
      },
    });

    const lastPlayed = g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : null;
    await db.userGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: { playtimeMinutes: g.playtime_forever, playtime2Weeks: g.playtime_2weeks, lastPlayedAt: lastPlayed },
      create: { userId, gameId: game.id, playtimeMinutes: g.playtime_forever, playtime2Weeks: g.playtime_2weeks, lastPlayedAt: lastPlayed },
    });

    count++;
  }

  await db.user.update({ where: { id: userId }, data: { lastSyncAt: new Date() } });
  return count;
}

// Review scraping (best-effort, may fail if Steam blocks)
interface RawReview {
  gameName: string;
  content: string;
  isRecommended: boolean;
  steamReviewId: string;
}

async function fetchUserReviews(steamId: string): Promise<RawReview[]> {
  try {
    const url = `https://steamcommunity.com/profiles/${steamId}/recommended/`;
    const res = await fetchWithProxy(url, 10000);
    const text = await res.text();

    const reviews: RawReview[] = [];
    const blockRegex = /<div class="recommendation_review"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      const html = match[1];
      const contentMatch = html.match(/<div class="recommendation_desc">([\s\S]*?)<\/div>/);
      const titleMatch = html.match(/<a[^>]*>([^<]+)<\/a>/);
      const idMatch = html.match(/data-modal-content-url="[^"]*id=(\d+)"/);

      if (contentMatch && titleMatch) {
        reviews.push({
          gameName: titleMatch[1].trim(),
          content: contentMatch[1].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").trim(),
          isRecommended: !html.includes("Not Recommended"),
          steamReviewId: idMatch?.[1] ?? `review_${Date.now()}_${reviews.length}`,
        });
      }
    }

    return reviews;
  } catch {
    return [];
  }
}

export async function syncReviews(userId: string, steamId: string) {
  const reviews = await fetchUserReviews(steamId);

  for (const r of reviews) {
    const game = await db.game.findFirst({ where: { name: r.gameName } });
    if (!game) continue;

    await db.userReview.upsert({
      where: { steamReviewId: r.steamReviewId },
      update: { content: r.content, isRecommended: r.isRecommended },
      create: { userId, gameId: game.id, content: r.content, isRecommended: r.isRecommended, steamReviewId: r.steamReviewId },
    });
  }

  return reviews.length;
}
