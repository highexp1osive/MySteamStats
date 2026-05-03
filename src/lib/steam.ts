import { db } from "./db";

interface RawSteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks: number;
  img_icon_url: string;
  img_logo_url: string;
  last_played?: number;
}

function getCoverUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
}

function getHeaderUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

// Fetch owned games from public Steam profile XML (no API key needed)
export async function fetchOwnedGames(
  steamId: string
): Promise<RawSteamGame[]> {
  const url = `https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();

  const games: RawSteamGame[] = [];
  const gameRegex = /<game>([\s\S]*?)<\/game>/g;
  let match;

  while ((match = gameRegex.exec(text)) !== null) {
    const xml = match[1];
    const appid = parseInt(
      xml.match(/<appID>(\d+)<\/appID>/)?.[1] ?? "0"
    );
    const name =
      xml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] ?? "";
    const playtime_forever =
      parseInt(
        xml.match(
          /<hoursOnRecord>(\d+(?:\.\d+)?)<\/hoursOnRecord>/
        )?.[1] ?? "0"
      ) * 60;
    const playtime_2weeks =
      parseInt(
        xml.match(
          /<hoursInLast2Weeks>(\d+(?:\.\d+)?)<\/hoursInLast2Weeks>/
        )?.[1] ?? "0"
      ) * 60;
    const img_icon_url =
      xml.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>/)?.[1] ?? "";
    const img_logo_url =
      xml.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>/)?.[1] ?? "";
    const last_played = xml.match(
      /<lastPlayed>(\d+)<\/lastPlayed>/
    )?.[1];

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

// Fetch game genres from Steam store API
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

// Sync user's game library to database
export async function syncGameLibrary(
  userId: string,
  steamId: string
): Promise<number> {
  const rawGames = await fetchOwnedGames(steamId);
  let synced = 0;

  for (const raw of rawGames) {
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

    await db.userGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: {
        playtimeMinutes: raw.playtime_forever,
        playtime2Weeks: raw.playtime_2weeks,
        lastPlayedAt: raw.last_played
          ? new Date(raw.last_played * 1000)
          : null,
      },
      create: {
        userId,
        gameId: game.id,
        playtimeMinutes: raw.playtime_forever,
        playtime2Weeks: raw.playtime_2weeks,
        lastPlayedAt: raw.last_played
          ? new Date(raw.last_played * 1000)
          : null,
      },
    });

    synced++;
  }

  await db.user.update({
    where: { id: userId },
    data: { lastSyncAt: new Date() },
  });

  return synced;
}

// Fetch user's Steam reviews
interface RawReview {
  gameName: string;
  content: string;
  isRecommended: boolean;
  steamReviewId: string;
}

export async function fetchUserReviews(steamId: string): Promise<RawReview[]> {
  try {
    const url = `https://steamcommunity.com/profiles/${steamId}/recommended/`;
    const res = await fetch(url);
    const text = await res.text();

    const reviews: RawReview[] = [];
    const blockRegex =
      /<div class="recommendation_review"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      const html = match[1];
      const contentMatch = html.match(
        /<div class="recommendation_desc">([\s\S]*?)<\/div>/
      );
      const titleMatch = html.match(/<a[^>]*>([^<]+)<\/a>/);
      const idMatch = html.match(
        /data-modal-content-url="[^"]*id=(\d+)"/
      );

      if (contentMatch && titleMatch) {
        reviews.push({
          gameName: titleMatch[1].trim(),
          content: contentMatch[1]
            .replace(/<br\s*\/?>/g, "\n")
            .replace(/<[^>]+>/g, "")
            .trim(),
          isRecommended: !html.includes("Not Recommended"),
          steamReviewId:
            idMatch?.[1] ?? `review_${Date.now()}_${reviews.length}`,
        });
      }
    }

    return reviews;
  } catch {
    return [];
  }
}

// Sync reviews to database
export async function syncReviews(
  userId: string,
  steamId: string
): Promise<number> {
  const reviews = await fetchUserReviews(steamId);

  for (const review of reviews) {
    const game = await db.game.findFirst({
      where: { name: review.gameName },
    });
    if (!game) continue;

    await db.userReview.upsert({
      where: { steamReviewId: review.steamReviewId },
      update: {
        content: review.content,
        isRecommended: review.isRecommended,
      },
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
