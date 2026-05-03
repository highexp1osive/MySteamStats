import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncGameLibrary, syncReviews } from "@/lib/steam";
import { fetchWithProxy } from "@/lib/fetch-with-proxy";

function parseSteamId(url: string): string | null {
  const match = url.match(/\/openid\/id\/(\d+)/);
  if (match) return match[1];
  return null;
}

function extractSteamId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const params = url.searchParams;
  if (params.get("openid.mode") !== "id_res") return null;
  const claimedId = params.get("openid.claimed_id") ?? "";
  return parseSteamId(claimedId);
}

async function fetchPlayerViaWebApi(steamId: string) {
  try {
    const key = process.env.STEAM_API_KEY;
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamId}`;
    const res = await fetchWithProxy(url, undefined, 10000);
    if (!res.ok) return null;
    const json = await res.json();
    const p = json.response?.players?.[0];
    if (!p) return null;
    return {
      steamid: p.steamid,
      personaname: p.personaname,
      avatarfull: p.avatarfull,
      profileurl: p.profileurl,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const steamId = extractSteamId(request);
  if (!steamId) {
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }

  // Fetch player info via proxy
  let player = await fetchPlayerViaWebApi(steamId);
  if (!player) {
    player = {
      steamid: steamId,
      personaname: `Steam_${steamId.slice(-6)}`,
      avatarfull: "",
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    };
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

  // Background sync via proxy
  syncGameLibrary(user.id, steamId).catch((e) =>
    console.error("Game sync failed:", e.message)
  );
  syncReviews(user.id, steamId).catch((e) =>
    console.error("Review sync failed:", e.message)
  );

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
