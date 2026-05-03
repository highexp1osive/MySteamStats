import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommend";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const { mode }: { mode: "backlog" | "continue_playing" } = await request.json();

  try {
    const recommendations = await getRecommendations(session.userId!, mode ?? "backlog");
    return NextResponse.json({ recommendations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
