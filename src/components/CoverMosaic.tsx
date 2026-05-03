"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Cover {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

interface LayoutItem {
  cover: Cover;
  x: number;
  y: number;
  w: number;
  h: number;
}

function calcLayout(covers: Cover[], canvasSize: number): LayoutItem[] {
  if (covers.length === 0) return [];

  const maxH = Math.max(...covers.map((c) => c.playtimeHours), 1);
  const minH = Math.min(...covers.map((c) => c.playtimeHours), 1);

  // Assign weight 1~4 based on playtime
  const items = covers.map((c) => ({
    cover: c,
    weight:
      maxH === minH
        ? 2
        : 1 + ((c.playtimeHours - minH) / (maxH - minH)) * 3,
  }));

  // Row-based packing: fill each row, scale to fit width exactly
  const layout: LayoutItem[] = [];
  let row: { cover: Cover; weight: number }[] = [];
  let rowWeight = 0;
  const targetRowWeight = 8; // total weight per row

  for (const item of items) {
    row.push(item);
    rowWeight += item.weight;
    if (rowWeight >= targetRowWeight || item === items[items.length - 1]) {
      // Scale row to fill width
      const scale = targetRowWeight / rowWeight;
      let x = 0;
      const rowItems: LayoutItem[] = [];
      for (const r of row) {
        const w = (r.weight / rowWeight) * canvasSize;
        rowItems.push({ cover: r.cover, x, y: 0, w, h: 0 });
        x += w;
      }
      // Calculate row height based on aspect ratio (3:4)
      const avgW = canvasSize / row.length;
      const rowH = avgW * 1.25;
      for (const ri of rowItems) {
        ri.h = rowH;
      }
      layout.push(...rowItems);
      row = [];
      rowWeight = 0;
    }
  }

  // Assign y positions
  let y = 0;
  let currentRow = 0;
  let prevRowEnd = 0;
  const rowGroups: LayoutItem[][] = [];
  let currentGroup: LayoutItem[] = [];

  for (const item of layout) {
    if (item.x === 0 && currentGroup.length > 0) {
      rowGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(item);
  }
  if (currentGroup.length > 0) rowGroups.push(currentGroup);

  const result: LayoutItem[] = [];
  y = 0;
  for (const group of rowGroups) {
    const rowH = group[0].h;
    for (const item of group) {
      result.push({ ...item, y });
    }
    y += rowH;
  }

  return result;
}

export default function CoverMosaic({ covers }: { covers: Cover[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const canvasSize = 2000;

  const filtered = covers.filter((c) => c.playtimeHours > 0);
  const totalGames = filtered.length;
  const totalHours = filtered.reduce((s, c) => s + c.playtimeHours, 0);

  const generate = useCallback(async () => {
    const canvas = document.createElement("canvas");
    const layout = calcLayout(filtered, canvasSize);

    // Calculate total height
    const totalH =
      layout.length > 0
        ? Math.max(...layout.map((l) => l.y + l.h))
        : canvasSize;

    canvas.width = canvasSize;
    canvas.height = Math.round(totalH);

    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw each cover
    const loadImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
      });

    const drawPromises = layout.map(async (item) => {
      try {
        const img = await loadImage(item.cover.coverUrl);
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const coverAspect = iw / ih;
        const cellAspect = item.w / item.h;

        let sw: number, sh: number, sx: number, sy: number;

        if (coverAspect > cellAspect) {
          // Image wider than cell — crop sides
          sh = ih;
          sw = ih * cellAspect;
          sx = (iw - sw) / 2;
          sy = 0;
        } else {
          // Image taller than cell — crop top/bottom
          sw = iw;
          sh = iw / cellAspect;
          sx = 0;
          sy = (ih - sh) / 2;
        }

        ctx.drawImage(
          img,
          sx, sy, sw, sh,
          item.x, item.y, item.w, item.h
        );
      } catch {
        // Draw placeholder for failed images
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(item.x, item.y, item.w, item.h);
      }
    });

    await Promise.all(drawPromises);

    // Stats overlay — top right
    const pad = 30;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.roundRect(canvas.width - 320, pad, 290, 80, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${totalGames} 款游戏`, canvas.width - pad - 10, pad + 40);

    ctx.fillStyle = "#1a9fff";
    ctx.font = "bold 22px Inter, sans-serif";
    ctx.fillText(`${totalHours.toLocaleString()} 小时`, canvas.width - pad - 10, pad + 68);

    setImageUrl(canvas.toDataURL("image/png"));
  }, [filtered, totalGames, totalHours]);

  useEffect(() => {
    if (filtered.length > 0) generate();
  }, [generate, filtered.length]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#171a21]">
          游戏星系 · {totalGames} 款 · {totalHours.toLocaleString()}h
        </h2>
        {imageUrl && (
          <a
            href={imageUrl}
            download="mysteamstats-collage.png"
            className="bg-[#1a9fff] hover:bg-[#1789dd] text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            保存大图
          </a>
        )}
      </div>

      <div className="flex justify-center">
        {!imageUrl ? (
          <div className="text-center py-20 text-[#5f7d9a] text-sm">
            生成中...
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="游戏封面拼图"
            className="max-w-full rounded-xl shadow-lg"
          />
        )}
      </div>
    </div>
  );
}
