import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST() {
  const { requireAuth } = await import("@/lib/auth");
  const { syncGameLibrary } = await import("@/lib/steam");

  const session = await requireAuth();
  try {
    const gameCount = await syncGameLibrary(session.userId!, session.steamId!);
    return NextResponse.json({ success: true, gameCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
