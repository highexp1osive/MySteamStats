import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  const { callDeepSeek, buildPersonalityPrompt, buildReviewStylePrompt } = await import("@/lib/deepseek");

  const session = await requireAuth();
  const { type, refresh }: { type: "personality" | "review_style"; refresh?: boolean } = await request.json();

  if (!refresh) {
    const cached = await db.aIAnalysis.findUnique({
      where: { userId_type: { userId: session.userId!, type } },
    });
    const maxAge = type === "personality" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    if (cached && Date.now() - new Date(cached.generatedAt).getTime() < maxAge) {
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

    if (reviews.length === 0) {
      return NextResponse.json({
        result: { text: "你还没有在 Steam 上写过任何评测。" },
        cached: false,
      });
    }

    prompt = buildReviewStylePrompt(
      reviews.map((r) => ({ gameName: r.game.name, content: r.content, isRecommended: r.isRecommended }))
    );
  }

  try {
    const result = await callDeepSeek(prompt);
    await db.aIAnalysis.upsert({
      where: { userId_type: { userId: session.userId!, type } },
      update: { content: { text: result }, generatedAt: new Date() },
      create: { userId: session.userId!, type, content: { text: result } },
    });
    return NextResponse.json({ result: { text: result }, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
