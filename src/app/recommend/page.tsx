"use client";

import { useState, useEffect } from "react";
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

function cacheKey(mode: string) { return `mysteamstats_recommend_${mode}`; }

function loadCache(mode: string): RecommendItem[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(mode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(mode: string, items: RecommendItem[]) {
  try { sessionStorage.setItem(cacheKey(mode), JSON.stringify(items)); } catch {}
}

export default function RecommendPage() {
  const [mode, setMode] = useState<"backlog" | "continue_playing">("backlog");
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Track which modes have been generated
  const [generatedModes, setGeneratedModes] = useState<Set<string>>(new Set());

  // Load cache + switch mode
  useEffect(() => {
    const cachedBacklog = loadCache("backlog");
    const cachedContinue = loadCache("continue_playing");
    const gen = new Set<string>();
    if (cachedBacklog) gen.add("backlog");
    if (cachedContinue) gen.add("continue_playing");
    setGeneratedModes(gen);

    // Default to backlog's cache, or continue's cache, or empty
    if (cachedBacklog) {
      setMode("backlog");
      setItems(cachedBacklog);
    } else if (cachedContinue) {
      setMode("continue_playing");
      setItems(cachedContinue);
    } else {
      setMode("backlog");
      setItems([]);
    }
    setHydrated(true);
  }, []);

  const switchMode = (newMode: "backlog" | "continue_playing") => {
    setMode(newMode);
    const cached = loadCache(newMode);
    if (cached) {
      setItems(cached);
    }
  };

  const hasGenerated = generatedModes.has(mode);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      const newItems = json.recommendations ?? [];
      setItems(newItems);
      setGeneratedModes((prev) => new Set(prev).add(mode));
      saveCache(mode, newItems);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TabNav current="recommend" />
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => switchMode("backlog")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              mode === "backlog"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            清 Backlog
          </button>
          <button
            onClick={() => switchMode("continue_playing")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              mode === "continue_playing"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            继续沉迷
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="ml-auto bg-[#1a9fff] hover:bg-[#1789dd] disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            {loading ? "分析中..." : hasGenerated ? "换一批" : "生成推荐"}
          </button>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <div className="w-8 h-8 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#5f7d9a] text-sm">AI 正在为你挑选游戏...</p>
          </div>
        )}

        {hydrated && !hasGenerated && !loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex gap-4 items-center" style={{ opacity: 1 - n * 0.2 }}>
                <div className="text-2xl font-bold text-[#c7d5e0] w-8 text-center">{n}</div>
                <div className="w-12 h-16 bg-[#e2e8f0] rounded-lg shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-[#e2e8f0] rounded w-32 mb-2" />
                  <div className="h-4 bg-[#e2e8f0] rounded w-48" />
                </div>
              </div>
            ))}
            <p className="text-center text-[#8ba3b8] text-xs pt-2">选择推荐模式，点击"生成推荐"查看 AI 为你挑选的游戏</p>
          </div>
        )}

        {hasGenerated && !loading && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <p className="text-[#5f7d9a] text-sm">暂无推荐结果</p>
          </div>
        )}

        {hasGenerated && !loading && items.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-3 text-xs text-[#8ba3b8]">
              <span>评分：</span>
              <span className="text-green-500 font-medium">8-10 强烈推荐</span>
              <span className="text-yellow-500 font-medium">6-7 值得一试</span>
              <span className="text-gray-400 font-medium">1-5 可考虑</span>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <RecommendCard key={item.name} item={item} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
