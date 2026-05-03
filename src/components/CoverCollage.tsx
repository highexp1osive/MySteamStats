"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

interface Cover {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

export default function CoverCollage({ covers }: { covers: Cover[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!gridRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(gridRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0a14",
      });
      const link = document.createElement("a");
      link.download = "mysteamstats-collage.png";
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to generate image:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#171a21]">
          游戏封面拼图 · {covers.length} 款
        </h2>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-[#1a9fff] hover:bg-[#1789dd] disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-medium transition"
        >
          {downloading ? "生成中..." : "保存大图"}
        </button>
      </div>

      <div
        ref={gridRef}
        className="grid gap-1 p-2 rounded-xl"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(80px, 1fr))`,
          background: "#0a0a14",
        }}
      >
        {covers.map((c) => (
          <div key={c.id} className="relative group">
            <img
              src={c.coverUrl}
              alt={c.name}
              className="w-full aspect-[3/4] object-cover rounded-sm"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center rounded-sm">
              <span className="text-white text-xs font-medium text-center px-1 leading-tight">
                {c.name}
              </span>
              <span className="text-[#1a9fff] text-xs mt-0.5">
                {c.playtimeHours}h
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
