import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncGameLibrary } from "@/lib/steam";
import { fetchWithProxy } from "@/lib/fetch-with-proxy";

function extractSteamId(request: NextRequest): string | null {
  const params = new URL(request.url).searchParams;
  if (params.get("openid.mode") !== "id_res") return null;
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/\/openid\/id\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchPlayer(steamId: string) {
  try {
    const key = process.env.STEAM_API_KEY;
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamId}`;
    const res = await fetchWithProxy(url, 10000);
    if (!res.ok) return null;
    const json = await res.json();
    return json.response?.players?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const steamId = extractSteamId(request);
  if (!steamId) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }

  const p = await fetchPlayer(steamId);
  const player = p ?? {
    steamid: steamId,
    personaname: `Steam_${steamId.slice(-6)}`,
    avatarfull: "",
    profileurl: `https://steamcommunity.com/profiles/${steamId}`,
  };

  const user = await db.user.upsert({
    where: { steamId },
    update: { displayName: player.personaname, avatarUrl: player.avatarfull, profileUrl: player.profileurl },
    create: { steamId, displayName: player.personaname, avatarUrl: player.avatarfull, profileUrl: player.profileurl },
  });

  const session = await getSession();
  session.userId = user.id;
  session.steamId = steamId;
  await session.save();

  syncGameLibrary(user.id, steamId).catch((e) => console.error("Game sync failed:", e.message));

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
