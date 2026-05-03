"use client";

import { useState } from "react";
import TabNav from "@/components/TabNav";
import AnalysisCard from "@/components/AnalysisCard";

export default function AnalysisPage() {
  const [tab, setTab] = useState<"personality" | "review_style">("personality");
  const [data, setData] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      setData((prev) => ({ ...prev, [type]: json.result?.text ?? null }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => fetchAnalysis(tab);

  return (
    <div className="max-w-3xl mx-auto">
      <TabNav current="analysis" />
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("personality")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === "personality"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            玩家性格锐评
          </button>
          <button
            onClick={() => setTab("review_style")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === "review_style"
                ? "bg-[#1a9fff] text-white"
                : "bg-white border border-[#e2e8f0] text-[#5f7d9a] hover:text-[#171a21]"
            }`}
          >
            评测风格分析
          </button>
        </div>

        <AnalysisCard
          content={data[tab] ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          title={tab === "personality" ? "玩家性格锐评" : "评测风格分析"}
        />
      </div>
    </div>
  );
}
