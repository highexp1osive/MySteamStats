import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TabNav from "@/components/TabNav";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: "游戏库可视化",
    desc: "网格、星系图多维度浏览你的游戏收藏",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><circle cx="4" cy="8" r="1.5" /><circle cx="20" cy="14" r="1.5" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="6" r="1.5" />
      </svg>
    ),
    title: "封面拼图",
    desc: "螺旋排列生成高清封面大图，时长越多越靠近中心",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 014 4c0 2-4 6-4 6s-4-4-4-6a4 4 0 014-4z" /><circle cx="12" cy="6" r="1" /><path d="M8 14l4 4 4-4" />
      </svg>
    ),
    title: "AI 玩家锐评",
    desc: "DeepSeek 分析你的游戏偏好，毒舌中带洞察",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9" />
      </svg>
    ),
    title: "智能推荐",
    desc: "根据游玩习惯，推荐库中接下来该玩的游戏",
  },
];

export default async function HomePage() {
  const session = await getSession();
  const loggedIn = !!session.userId;

  let stats: { totalGames: number; totalHours: number } | null = null;

  if (loggedIn) {
    const userGames = await db.userGame.findMany({
      where: { userId: session.userId },
      select: { playtimeMinutes: true },
    });

    stats = {
      totalGames: userGames.length,
      totalHours: Math.round(userGames.reduce((s, ug) => s + ug.playtimeMinutes, 0) / 60),
    };
  }

  return (
    <div className="max-w-7xl mx-auto">
      <TabNav current="home" />

      <div className="flex flex-col items-center justify-center px-6 pb-12 text-center min-h-[calc(100vh-49px-64px)]">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#171a21] mb-4">
          探索你的 Steam 游戏人生
        </h1>
        <p className="text-[#5f7d9a] text-sm leading-relaxed max-w-md mb-10">
          连接 Steam 账号，获取游戏库可视化、AI 锐评和智能推荐。
          支持开源自托管，你的数据你做主。
        </p>

        {!loggedIn ? (
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-2 bg-[#1a9fff] hover:bg-[#1789dd] text-white px-8 py-3 rounded-full text-base font-semibold shadow-md shadow-[#1a9fff]/15 transition mb-14"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z" />
            </svg>
            连接 Steam
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-14 w-full max-w-sm">
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center">
              <div className="text-2xl font-bold text-[#1a9fff]">{stats!.totalGames}</div>
              <div className="text-[#5f7d9a] text-xs">游戏总数</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center">
              <div className="text-2xl font-bold text-[#1a9fff]">{stats!.totalHours.toLocaleString()}h</div>
              <div className="text-[#5f7d9a] text-xs">总时长</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center hover:border-[#1a9fff] hover:shadow-sm transition"
            >
              <div className="text-[#1a9fff] mb-2 flex justify-center">{f.icon}</div>
              <h3 className="text-sm font-semibold text-[#171a21] mb-1">{f.title}</h3>
              <p className="text-[#5f7d9a] text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
