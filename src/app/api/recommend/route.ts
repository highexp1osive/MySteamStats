import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { getRecommendations } = await import("@/lib/recommend");

  const session = await requireAuth();
  const { mode }: { mode: "backlog" | "continue_playing" } = await request.json();

  try {
    const recommendations = await getRecommendations(session.userId!, mode ?? "backlog");
    return NextResponse.json({ recommendations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
