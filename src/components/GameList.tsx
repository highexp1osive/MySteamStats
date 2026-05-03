"use client";

import { useState } from "react";
import type { GameWithPlaytime } from "@/types";
import GameCard from "./GameCard";

interface GameListProps {
  games: GameWithPlaytime[];
  allGenres: string[];
}

export default function GameList({ games, allGenres }: GameListProps) {
  const [sort, setSort] = useState("playtime");
  const [genre, setGenre] = useState("");
  const [search, setSearch] = useState("");

  let filtered = games;
  if (genre) {
    filtered = filtered.filter((g) => g.genres.includes(genre));
  }
  if (search) {
    filtered = filtered.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (sort === "playtime") {
    filtered.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
  } else if (sort === "recent") {
    filtered.sort((a, b) =>
      (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "")
    );
  } else if (sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="搜索游戏..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="playtime">按游玩时长</option>
          <option value="recent">按最近游玩</option>
          <option value="name">按游戏名称</option>
        </select>
        <select
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">全部类型</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          没有找到匹配的游戏
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
