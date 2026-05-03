"use client";

import { useState, useEffect } from "react";
import TabNav from "@/components/TabNav";
import AnalysisCard from "@/components/AnalysisCard";

export default function AnalysisPage() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // Auto-load from cache on mount
  useEffect(() => {
    fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "personality" }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.result?.text) setData(json.result.text);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const fetchAnalysis = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "personality", refresh }),
      });
      const json = await res.json();
      setData(json.result?.text ?? null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <TabNav current="analysis" />
      <div className="px-4 sm:px-6 pb-6">
        {!checked ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <div className="w-8 h-8 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#5f7d9a] text-sm">加载中...</p>
          </div>
        ) : (
          <AnalysisCard
            content={data}
            loading={loading}
            onRefresh={() => fetchAnalysis(true)}
            title="玩家性格锐评"
          />
        )}
      </div>
    </div>
  );
}
