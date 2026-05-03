"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Cover {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
  completed?: boolean;
}

interface GameBox {
  game: Cover;
  w: number;
  h: number;
  x: number;
  y: number;
}

// Steam header images: 460x215, aspect ~2.14
const HEADER_ASPECT = 460 / 215;
const SCALE = 2; // High DPI

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function hasOverlap(box: { x: number; y: number; w: number; h: number }, placed: GameBox[]) {
  for (const p of placed) {
    if (rectsOverlap(box, { x: p.x, y: p.y, w: p.w, h: p.h })) return true;
  }
  return false;
}

function spiralPlacement(
  boxes: { game: Cover; w: number; h: number }[],
  canvasW: number,
  canvasH: number
): GameBox[] {
  const placed: GameBox[] = [];
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const step = 8;

  for (const box of boxes) {
    let bestPos: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    const sx = cx - box.w / 2;
    const sy = cy - box.h / 2;

    if (!hasOverlap({ x: sx, y: sy, w: box.w, h: box.h }, placed)) {
      bestPos = { x: sx, y: sy };
    } else {
      for (let r = step; r < Math.max(canvasW, canvasH) && !bestPos; r += step) {
        const n = Math.max(8, Math.floor((2 * Math.PI * r) / step));
        for (let i = 0; i < n; i++) {
          const a = (2 * Math.PI * i) / n;
          const x = cx + Math.cos(a) * r - box.w / 2;
          const y = cy + Math.sin(a) * r - box.h / 2;
          if (x < 0 || y < 0 || x + box.w > canvasW || y + box.h > canvasH) continue;
          if (!hasOverlap({ x, y, w: box.w, h: box.h }, placed)) {
            const d = Math.sqrt((x + box.w / 2 - cx) ** 2 + (y + box.h / 2 - cy) ** 2);
            if (d < bestDist) { bestDist = d; bestPos = { x, y }; }
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

function getBoundingBox(boxes: GameBox[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  }
  return { minX, minY, maxX, maxY };
}

export default function CoverMosaic({ covers }: { covers: Cover[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);

  const filtered = covers
    .filter((c) => c.playtimeHours > 0)
    .sort((a, b) => b.playtimeHours - a.playtimeHours);
  const totalGames = filtered.length;
  const totalHours = filtered.reduce((s, c) => s + c.playtimeHours, 0);
  const maxPlaytime = filtered[0]?.playtimeHours ?? 1;

  const generate = useCallback(async () => {
    if (filtered.length === 0 || loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setProgress(0);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sizes: 45-250px height, width from aspect ratio
    const minH = 45;
    const maxH = 250;
    const boxes = filtered.map((g) => {
      const ratio = Math.sqrt(g.playtimeHours / maxPlaytime);
      const h = Math.round(minH + ratio * (maxH - minH));
      const w = Math.round(h * HEADER_ASPECT);
      return { game: g, w, h };
    });

    // Place with spiral (largest = closest to center)
    const workingSize = 4000;
    const placed = spiralPlacement(boxes, workingSize, workingSize);
    if (placed.length === 0) { setLoading(false); return; }

    // Calculate bounding box and normalize
    const bounds = getBoundingBox(placed);
    const pad = 40;
    const logicalW = bounds.maxX - bounds.minX + pad * 2;
    const logicalH = bounds.maxY - bounds.minY + pad * 2;

    for (const p of placed) {
      p.x = p.x - bounds.minX + pad;
      p.y = p.y - bounds.minY + pad;
    }

    canvas.width = logicalW * SCALE;
    canvas.height = logicalH * SCALE;
    ctx.scale(SCALE, SCALE);

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Load images
    const imageMap = new Map<string, HTMLImageElement>();
    let loaded = 0;

    for (const p of placed) {
      const appId = p.game.coverUrl.match(/\/apps\/(\d+)\//)?.[1];
      if (!appId) { loaded++; continue; }

      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
      )}`;

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

      loaded++;
      setProgress(Math.round((loaded / placed.length) * 100));
    }

    // Draw in reverse (biggest on top)
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i];
      const img = imageMap.get(p.game.id);
      if (img) {
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
        // Green border for completed games
        if (p.game.completed) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        }
      } else {
        ctx.fillStyle = "#1a1a24";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // Stats — top right
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

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${totalGames} 款游戏`, logicalW - pad - 12, by + 40);
    ctx.fillStyle = "#1a9fff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(`${totalHours.toLocaleString()} 小时`, logicalW - pad - 12, by + 70);

    setGenerated(true);
    setLoading(false);
  }, [filtered, maxPlaytime, totalGames, totalHours, loading]);

  useEffect(() => {
    if (filtered.length > 0 && !generated && !loading) {
      const t = setTimeout(() => generate(), 100);
      return () => clearTimeout(t);
    }
  }, [filtered.length, generated, loading, generate]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "steam-game-collage.png";
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
          <button
            onClick={download}
            className="bg-[#1a9fff] hover:bg-[#1789dd] text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            保存大图
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <div className="relative rounded-xl overflow-hidden bg-[#0a0a0f] border border-[#e2e8f0] w-full">
          <canvas
            ref={canvasRef}
            style={{ display: generated ? "block" : "none", width: "100%", height: "auto" }}
          />
          {!generated && (
            <div className="aspect-[16/10] flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-[#5f7d9a]">
                  {loading ? `正在生成拼图... ${progress}%` : "准备生成..."}
                </p>
                <p className="text-xs text-[#5f7d9a] mt-1">{totalGames} 款游戏</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
