"use client";

import { useState } from "react";

export default function SyncButton() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const sync = async () => {
    setStatus("loading");
    setMessage("正在通过代理同步 Steam 数据...");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(`同步完成！${data.gameCount} 个游戏`);
        setStatus("done");
      } else {
        throw new Error(data.error ?? "Unknown error");
      }
    } catch (e: any) {
      setMessage(e.message ?? "同步失败");
      setStatus("error");
    }
  };

  return (
    <div className="text-center py-8">
      {status === "idle" && (
        <button
          onClick={sync}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition"
        >
          同步 Steam 数据
        </button>
      )}

      {status === "loading" && (
        <div>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">{message}</p>
        </div>
      )}

      {status === "done" && (
        <div>
          <p className="text-green-400 mb-3">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-orange-500 transition"
          >
            刷新页面查看
          </button>
        </div>
      )}

      {status === "error" && (
        <div>
          <p className="text-red-400 mb-3">{message}</p>
          <button
            onClick={sync}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}
