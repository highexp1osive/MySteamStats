import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TabNav from "@/components/TabNav";
import CoverMosaic from "@/components/CoverMosaic";

export default async function GalaxyPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const userGames = await db.userGame.findMany({
    where: { userId: session.userId },
    include: { game: true },
    orderBy: { playtimeMinutes: "desc" },
  });

  const covers = userGames.map((ug) => ({
    id: ug.game.id,
    name: ug.game.name,
    coverUrl: ug.game.coverUrl,
    playtimeHours: Math.round(ug.playtimeMinutes / 60),
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <TabNav current="galaxy" />
      <div className="px-4 sm:px-6 pb-6">
        <CoverMosaic covers={covers} />
      </div>
    </div>
  );
}
