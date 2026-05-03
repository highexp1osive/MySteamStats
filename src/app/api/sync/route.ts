import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncGameLibrary } from "@/lib/steam";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireAuth();

  try {
    const gameCount = await syncGameLibrary(session.userId!, session.steamId!);
    return NextResponse.json({ success: true, gameCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
