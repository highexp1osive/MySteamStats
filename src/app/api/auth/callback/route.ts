import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncGameLibrary, syncReviews } from "@/lib/steam";

function parseSteamId(url: string): string | null {
  const match = url.match(/\/profiles\/(\d+)/);
  if (match) return match[1];
  const customMatch = url.match(/\/id\/([^/]+)/);
  if (customMatch) return customMatch[1];
  return null;
}

async function verifyOpenId(request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  const params = url.searchParams;

  if (params.get("openid.mode") !== "id_res") return null;

  const verifyParams = new URLSearchParams();
  params.forEach((value, key) => {
    verifyParams.set(key, value);
  });
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
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.response?.players?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchPlayerSummaryNoApiKey(steamId: string) {
  try {
    const url = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
    const res = await fetch(url);
    const text = await res.text();

    const nameMatch = text.match(
      /<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/
    );
    const avatarMatch = text.match(
      /<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/
    );

    return {
      steamid: steamId,
      personaname: nameMatch?.[1] ?? "Steam User",
      avatarfull: avatarMatch?.[1] ?? "",
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const steamId = await verifyOpenId(request);
  if (!steamId) {
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }

  let player = await fetchPlayerSummary(steamId);
  if (!player) {
    player = await fetchPlayerSummaryNoApiKey(steamId);
  }
  if (!player) {
    return NextResponse.redirect(
      new URL("/?error=profile_fetch_failed", request.url)
    );
  }

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

  const session = await getSession();
  session.userId = user.id;
  session.steamId = steamId;
  await session.save();

  // Async background sync (don't block login)
  syncGameLibrary(user.id, steamId).catch(console.error);
  syncReviews(user.id, steamId).catch(console.error);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
