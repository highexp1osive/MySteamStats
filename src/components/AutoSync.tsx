"use client";

import { useEffect, useState, useCallback } from "react";

export default function AutoSync() {
  const [status, setStatus] = useState<"syncing" | "error">("syncing");
  const [error, setError] = useState("");

  const doSync = useCallback(async () => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        throw new Error(data.error ?? "同步失败");
      }
    } catch (e: any) {
      setError(e.message ?? "同步失败，请检查网络");
      setStatus("error");
    }
  }, []);

  useEffect(() => { doSync(); }, [doSync]);

  if (status === "syncing") {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#5f7d9a] text-sm">正在同步 Steam 游戏数据...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <p className="text-red-500 text-sm mb-3">{error}</p>
      <button
        onClick={doSync}
        className="bg-[#1a9fff] hover:bg-[#1789dd] text-white px-5 py-2 rounded-full text-sm font-medium transition"
      >
        重试
      </button>
    </div>
  );
}
