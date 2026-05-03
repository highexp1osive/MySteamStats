import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  const { gameId, completed } = await request.json();

  await db.userGame.updateMany({
    where: { userId: session.userId!, gameId },
    data: { completed },
  });

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
