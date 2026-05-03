import type { GameWithPlaytime } from "@/types";

export default function GameCard({ game }: { game: GameWithPlaytime }) {
  const hours = Math.round(game.playtimeMinutes / 60);

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#e2e8f0] hover:border-[#1a9fff] hover:shadow-md transition">
      <img
        src={game.coverUrl}
        alt={game.name}
        className="w-full aspect-[3/4] object-cover"
        loading="lazy"
      />
      <div className="p-2.5">
        <h3 className="text-sm font-medium text-[#171a21] truncate">
          {game.name}
        </h3>
        <div className="flex justify-between text-xs text-[#5f7d9a] mt-1">
          <span>{hours}h</span>
          {game.lastPlayedAt && (
            <span>
              {new Date(game.lastPlayedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
