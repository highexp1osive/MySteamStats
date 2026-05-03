import { NextRequest, NextResponse } from "next/server";
import { fetchWithProxy } from "@/lib/fetch-with-proxy";

const ALLOWED_DOMAINS = [
  "media.steampowered.com",
  "steamcdn-a.akamaihd.net",
  "avatars.steamstatic.com",
  "avatars.akamai.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
  "cdn.akamai.steamstatic.com",
  "shared.akamai.steamstatic.com",
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  const hostname = new URL(url).hostname;
  if (!ALLOWED_DOMAINS.some((d) => hostname.endsWith(d))) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

  try {
    const res = await fetchWithProxy(url, 10000);
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
