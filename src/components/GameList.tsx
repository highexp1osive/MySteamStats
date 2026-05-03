"use client";

import { useState } from "react";
import type { GameWithPlaytime } from "@/types";
import GameCard from "./GameCard";

export default function GameList({
  games,
  allGenres,
}: {
  games: GameWithPlaytime[];
  allGenres: string[];
}) {
  const [sort, setSort] = useState("playtime");
  const [genre, setGenre] = useState("");
  const [search, setSearch] = useState("");

  let filtered = games;
  if (genre) filtered = filtered.filter((g) => g.genres.includes(genre));
  if (search)
    filtered = filtered.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase())
    );

  if (sort === "playtime")
    filtered = [...filtered].sort(
      (a, b) => b.playtimeMinutes - a.playtimeMinutes
    );
  else if (sort === "recent")
    filtered = [...filtered].sort((a, b) =>
      (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "")
    );
  else if (sort === "name")
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const selectClass =
    "bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#171a21] focus:outline-none focus:border-[#1a9fff]";

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] text-[#171a21] placeholder-[#8ba3b8] focus:outline-none focus:border-[#1a9fff]"
          placeholder="搜索游戏..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="playtime">按游玩时长</option>
          <option value="recent">按最近游玩</option>
          <option value="name">按游戏名称</option>
        </select>
        <select
          className={selectClass}
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
        <p className="text-[#8ba3b8] text-center py-12 text-sm">
          没有找到匹配的游戏
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
