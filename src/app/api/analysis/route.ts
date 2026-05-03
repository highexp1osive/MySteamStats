import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { callDeepSeek, buildPersonalityPrompt, buildReviewStylePrompt } from "@/lib/deepseek";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const { type, refresh }: { type: "personality" | "review_style"; refresh?: boolean } = await request.json();

  // Check cache (skip if refresh)
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

    const reviewData = reviews.map((r) => ({
      gameName: r.game.name,
      content: r.content,
      isRecommended: r.isRecommended,
    }));

    if (reviewData.length === 0) {
      return NextResponse.json({
        result: { text: "你还没有在 Steam 上写过任何评测。去 Steam 上写几条评测再来吧！" },
        cached: false,
      });
    }

    prompt = buildReviewStylePrompt(reviewData);
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
