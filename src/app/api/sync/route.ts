import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncGameLibrary, syncReviews } from "@/lib/steam";

export async function POST() {
  const session = await requireAuth();

  try {
    const gameCount = await syncGameLibrary(
      session.userId!,
      session.steamId!
    );
    const reviewCount = await syncReviews(
      session.userId!,
      session.steamId!
    );

    return NextResponse.json({
      success: true,
      gameCount,
      reviewCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
