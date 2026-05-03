import type { GameWithPlaytime } from "@/types";

export default function GameCard({ game }: { game: GameWithPlaytime }) {
  const hours = Math.round(game.playtimeMinutes / 60);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden hover:ring-1 hover:ring-orange-500 transition">
      <img
        src={game.coverUrl}
        alt={game.name}
        className="w-full aspect-[3/4] object-cover"
        loading="lazy"
      />
      <div className="p-3">
        <h3 className="font-medium truncate">{game.name}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
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
