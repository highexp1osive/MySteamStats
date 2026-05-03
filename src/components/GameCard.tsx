"use client";

import { useState } from "react";
import type { GameWithPlaytime } from "@/types";

export default function GameCard({ game }: { game: GameWithPlaytime & { completed?: boolean } }) {
  const hours = Math.round(game.playtimeMinutes / 60);
  const [completed, setCompleted] = useState(game.completed ?? false);
  const [toggling, setToggling] = useState(false);

  const toggle = async () => {
    setToggling(true);
    const v = !completed;
    setCompleted(v);
    try {
      await fetch("/api/games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, completed: v }),
      });
    } catch { setCompleted(!v); }
    finally { setToggling(false); }
  };

  return (
    <div
      onClick={toggle}
      className={`bg-white rounded-xl overflow-hidden border transition cursor-pointer relative group ${
        completed ? "border-[#22c55e] border-2" : "border-[#e2e8f0] hover:border-[#1a9fff] hover:shadow-md"
      }`}
    >
      <img src={game.coverUrl} alt={game.name} className="w-full aspect-[3/4] object-cover" loading="lazy" />
      <div className="p-2.5">
        <h3 className="text-sm font-medium text-[#171a21] truncate">{game.name}</h3>
        <div className="flex justify-between text-xs text-[#5f7d9a] mt-1">
          <span>{hours}h</span>
          {game.lastPlayedAt && <span>{new Date(game.lastPlayedAt).toLocaleDateString("zh-CN")}</span>}
        </div>
      </div>
      {completed && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-[#22c55e] rounded-full flex items-center justify-center text-white text-xs font-bold">
          ✓
        </div>
      )}
    </div>
  );
}
