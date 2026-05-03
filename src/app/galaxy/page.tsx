import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TabNav from "@/components/TabNav";
import GalaxyView from "@/components/GalaxyView";

export default async function GalaxyPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const userGames = await db.userGame.findMany({
    where: { userId: session.userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  const planets = userGames.map((ug) => ({
    id: ug.game.id,
    name: ug.game.name,
    coverUrl: ug.game.coverUrl,
    playtimeHours: Math.round(ug.playtimeMinutes / 60),
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <TabNav current="galaxy" />
      <div className="h-[calc(100vh-49px-64px)]">
        <GalaxyView
          planets={planets}
          centerAvatar={user?.avatarUrl ?? ""}
        />
      </div>
    </div>
  );
}
