import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import StatsOverview from "@/components/StatsOverview";
import GameList from "@/components/GameList";
import AutoSync from "@/components/AutoSync";
import TabNav from "@/components/TabNav";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const userGames = await db.userGame.findMany({
    where: { userId: session.userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

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
    <div className="max-w-7xl mx-auto">
      <TabNav current="dashboard" />

      <div className="px-4 sm:px-6 pb-6">
        <StatsOverview
          totalGames={totalGames}
          totalHours={Math.round(totalMinutes / 60)}
          total2Weeks={Math.round(total2Weeks / 60)}
          userName={user?.displayName ?? ""}
        />

        {!hasData && <AutoSync />}
        {hasData && <GameList games={games} allGenres={allGenres} />}
      </div>
    </div>
  );
}
