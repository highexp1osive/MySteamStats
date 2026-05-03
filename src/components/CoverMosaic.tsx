"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Cover {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

interface GameBox {
  game: Cover;
  w: number;
  h: number;
  x: number;
  y: number;
}

const COVER_ASPECT = 600 / 900;

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function hasOverlap(box: { x: number; y: number; w: number; h: number }, placed: GameBox[]) {
  for (const p of placed) {
    if (rectsOverlap(box, { x: p.x, y: p.y, w: p.w, h: p.h })) return true;
  }
  return false;
}

function spiralPlacement(boxes: { game: Cover; w: number; h: number }[], canvasSize: number): GameBox[] {
  const placed: GameBox[] = [];
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const step = 6;

  for (const box of boxes) {
    let bestPos: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    // Try center first
    const sx = cx - box.w / 2;
    const sy = cy - box.h / 2;
    if (!hasOverlap({ x: sx, y: sy, w: box.w, h: box.h }, placed)) {
      bestPos = { x: sx, y: sy };
      bestDist = 0;
    } else {
      for (let r = step; r < canvasSize && !bestPos; r += step) {
        const numPoints = Math.max(8, Math.floor((2 * Math.PI * r) / step));
        for (let i = 0; i < numPoints; i++) {
          const angle = (2 * Math.PI * i) / numPoints;
          const x = cx + Math.cos(angle) * r - box.w / 2;
          const y = cy + Math.sin(angle) * r - box.h / 2;
          if (x < 0 || y < 0 || x + box.w > canvasSize || y + box.h > canvasSize) continue;
          if (!hasOverlap({ x, y, w: box.w, h: box.h }, placed)) {
            const dist = Math.sqrt(Math.pow(x + box.w / 2 - cx, 2) + Math.pow(y + box.h / 2 - cy, 2));
            if (dist < bestDist) { bestDist = dist; bestPos = { x, y }; }
          }
        }
        if (bestPos) break;
      }
    }

    if (bestPos) {
      placed.push({ game: box.game, w: box.w, h: box.h, x: bestPos.x, y: bestPos.y });
    }
  }

  return placed;
}

export default function CoverMosaic({ covers }: { covers: Cover[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canvasStyle, setCanvasStyle] = useState({ width: "100%", height: "auto" as string });

  const filtered = covers
    .filter((c) => c.playtimeHours > 0)
    .sort((a, b) => b.playtimeHours - a.playtimeHours);
  const totalGames = filtered.length;
  const totalHours = filtered.reduce((s, c) => s + c.playtimeHours, 0);

  const generate = useCallback(async () => {
    if (filtered.length === 0 || loading) return;
    setLoading(true);
    setProgress(0);

    const maxH = filtered[0].playtimeHours;
    const minSize = 90;
    const maxSize = 240;
    const canvasSize = 4000;

    const boxes = filtered.map((g) => {
      const ratio = Math.sqrt(g.playtimeHours / maxH);
      const h = Math.round(minSize + ratio * (maxSize - minSize));
      const w = Math.round(h * COVER_ASPECT);
      return { game: g, w, h };
    });

    const placed = spiralPlacement(boxes, canvasSize);
    if (placed.length === 0) { setLoading(false); return; }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of placed) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h);
    }

    const pad = 32;
    const logicalW = maxX - minX + pad * 2;
    const logicalH = maxY - minY + pad * 2;

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Normalize positions
    for (const p of placed) {
      p.x = p.x - minX + pad;
      p.y = p.y - minY + pad;
    }

    // Load images via proxy
    const imageMap = new Map<string, HTMLImageElement>();
    let loaded = 0;

    for (const p of placed) {
      const match = p.game.coverUrl.match(/\/apps\/(\d+)\//);
      const appId = match ? match[1] : null;
      const proxyUrl = appId
        ? `/api/image-proxy?url=${encodeURIComponent(`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`)}`
        : null;

      if (proxyUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = proxyUrl;
          });
          imageMap.set(p.game.id, img);
        } catch { /* skip */ }
      }
      loaded++;
      setProgress(Math.round((loaded / placed.length) * 100));
    }

    // Draw in reverse order (biggest on top)
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i];
      const img = imageMap.get(p.game.id);
      if (img) {
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
      } else {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // Stats overlay top-right
    const bx = logicalW - 360, by = pad, bw = 328, bh = 88, r = 18;
    ctx.fillStyle = "rgba(10,10,20,0.85)";
    ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${totalGames} 款游戏`, logicalW - pad - 12, by + 40);
    ctx.fillStyle = "#1a9fff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(`${totalHours.toLocaleString()} 小时`, logicalW - pad - 12, by + 70);

    // Display in page
    const canvasOut = canvasRef.current;
    if (canvasOut) {
      canvasOut.width = canvas.width;
      canvasOut.height = canvas.height;
      canvasOut.getContext("2d")!.drawImage(canvas, 0, 0);
    }

    const maxW = Math.min(960, logicalW);
    setCanvasStyle({ width: `${maxW}px`, height: `${(maxW / logicalW) * logicalH}px` });
    setGenerated(true);
    setLoading(false);
  }, [filtered, loading]);

  useEffect(() => {
    if (filtered.length > 0) { const t = setTimeout(() => generate(), 100); return () => clearTimeout(t); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "mysteamstats-collage.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#171a21]">
          游戏星系 · {totalGames} 款 · {totalHours.toLocaleString()}h
        </h2>
        {generated && (
          <button onClick={download} className="bg-[#1a9fff] hover:bg-[#1789dd] text-white px-5 py-2 rounded-full text-sm font-medium transition">
            保存大图
          </button>
        )}
      </div>
      <div className="flex justify-center">
        {!generated ? (
          <div className="text-center py-20 text-[#5f7d9a] text-sm">
            {loading ? `生成中... ${progress}%` : "准备生成..."}
          </div>
        ) : (
          <canvas ref={canvasRef} style={canvasStyle} className="rounded-xl shadow-lg max-w-full" />
        )}
      </div>
    </div>
  );
}
