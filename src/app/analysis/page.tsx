"use client";

import { useState } from "react";
import TabNav from "@/components/TabNav";
import AnalysisCard from "@/components/AnalysisCard";

export default function AnalysisPage() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        <AnalysisCard
          content={data}
          loading={loading}
          onRefresh={() => fetchAnalysis(true)}
          title="玩家性格锐评"
        />
      </div>
    </div>
  );
}
