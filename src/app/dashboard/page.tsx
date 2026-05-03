import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import StatsOverview from "@/components/StatsOverview";
import GameList from "@/components/GameList";
import SyncButton from "@/components/SyncButton";

interface DashboardSearchParams {
  sort?: string;
  q?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const sort = searchParams.sort ?? "playtime";
  const query = searchParams.q ?? "";

  let orderBy: Record<string, string> = { playtimeMinutes: "desc" };
  if (sort === "recent") orderBy = { lastPlayedAt: "desc" };
  if (sort === "name") orderBy = { game: { name: "asc" } } as any;

  const where: any = { userId: session.userId };
  if (query) {
    where.game = { name: { contains: query, mode: "insensitive" } };
  }

  const userGames = await db.userGame.findMany({
    where,
    include: { game: true },
    orderBy: sort === "name" ? { game: { name: "asc" } } : { playtimeMinutes: "desc" },
  });

  // Apply sort for recent in memory (Prisma sort on nullable is tricky)
  if (sort === "recent") {
    userGames.sort((a, b) =>
      (b.lastPlayedAt?.getTime() ?? 0) - (a.lastPlayedAt?.getTime() ?? 0)
    );
  }

  const totalGames = userGames.length;
  const totalMinutes = userGames.reduce(
    (sum, ug) => sum + ug.playtimeMinutes,
    0
  );
  const total2Weeks = userGames.reduce(
    (sum, ug) => sum + ug.playtime2Weeks,
    0
  );

  const games = userGames.map((ug) => ({
    id: ug.game.id,
    steamAppId: ug.game.steamAppId,
    name: ug.game.name,
    coverUrl: ug.game.coverUrl,
    headerUrl: ug.game.headerUrl,
    genres: ug.game.genres,
    playtimeMinutes: ug.playtimeMinutes,
    playtime2Weeks: ug.playtime2Weeks,
    lastPlayedAt: ug.lastPlayedAt?.toISOString() ?? null,
  }));

  const allGenres = Array.from(
    new Set(userGames.flatMap((ug) => ug.game.genres))
  ).sort();

  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  const hasData = totalGames > 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <StatsOverview
        totalGames={totalGames}
        totalHours={Math.round(totalMinutes / 60)}
        total2Weeks={Math.round(total2Weeks / 60)}
        userName={user?.displayName ?? ""}
      />

      {!hasData && (
        <div className="mb-8">
          <p className="text-gray-400 text-center mb-2">
            还没有游戏数据，点击下方按钮从 Steam 同步
          </p>
          <SyncButton />
        </div>
      )}

      {hasData && <GameList games={games} allGenres={allGenres} />}
    </div>
  );
}
