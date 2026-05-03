"use client";

import { useState } from "react";
import type { GameWithPlaytime } from "@/types";

interface GameCardProps {
  game: GameWithPlaytime & { completed?: boolean };
}

export default function GameCard({ game }: GameCardProps) {
  const hours = Math.round(game.playtimeMinutes / 60);
  const [completed, setCompleted] = useState(game.completed ?? false);
  const [toggling, setToggling] = useState(false);

  const toggleCompleted = async () => {
    setToggling(true);
    const newVal = !completed;
    setCompleted(newVal);
    try {
      await fetch("/api/games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, completed: newVal }),
      });
    } catch {
      setCompleted(!newVal); // revert on error
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#e2e8f0] hover:border-[#1a9fff] hover:shadow-md transition relative group">
      <img
        src={game.coverUrl}
        alt={game.name}
        className="w-full aspect-[3/4] object-cover"
        loading="lazy"
      />
      <div className="p-2.5">
        <h3 className="text-sm font-medium text-[#171a21] truncate">{game.name}</h3>
        <div className="flex justify-between text-xs text-[#5f7d9a] mt-1">
          <span>{hours}h</span>
          {game.lastPlayedAt && (
            <span>{new Date(game.lastPlayedAt).toLocaleDateString("zh-CN")}</span>
          )}
        </div>
      </div>
      {/* Completed toggle */}
      <button
        onClick={toggleCompleted}
        disabled={toggling}
        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs transition ${
          completed
            ? "bg-green-500 text-white"
            : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
        }`}
        title={completed ? "取消通关标记" : "标记为已通关"}
      >
        ✓
      </button>
    </div>
  );
}
