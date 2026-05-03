"use client";

import { useState } from "react";
import TabNav from "@/components/TabNav";
import RecommendCard from "@/components/RecommendCard";

interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl: string | null;
  inLibrary: boolean;
  appId: number | null;
}

export default function RecommendPage() {
  const [mode, setMode] = useState<"backlog" | "continue_playing">("backlog");
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      setItems(json.recommendations ?? []);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TabNav current="recommend" />
      <div className="px-4 sm:px-6 pb-6">
        {/* Mode selector */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode("backlog")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              mode === "backlog"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            清 Backlog
          </button>
          <button
            onClick={() => setMode("continue_playing")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              mode === "continue_playing"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            继续沉迷
          </button>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="ml-auto bg-[#1a9fff] hover:bg-[#1789dd] disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            {loading ? "分析中..." : "生成推荐"}
          </button>
        </div>

        {/* Results */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <div className="w-8 h-8 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#5f7d9a] text-sm">AI 正在为你挑选游戏...</p>
          </div>
        )}

        {done && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <p className="text-[#5f7d9a] text-sm">暂无推荐结果</p>
          </div>
        )}

        {done && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item, i) => (
              <RecommendCard key={item.name} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
