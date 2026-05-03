import Link from "next/link";

const tabs = [
  {
    href: "/",
    key: "home",
    label: "首页",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    key: "dashboard",
    label: "游戏库",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/galaxy",
    key: "galaxy",
    label: "星系",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="8" r="1.5" />
        <circle cx="20" cy="14" r="1.5" />
        <circle cx="8" cy="18" r="1.5" />
        <circle cx="16" cy="6" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/analysis",
    key: "analysis",
    label: "AI 锐评",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 014 4c0 2-4 6-4 6s-4-4-4-6a4 4 0 014-4z" />
        <circle cx="12" cy="6" r="1" />
        <path d="M8 14l4 4 4-4" />
      </svg>
    ),
  },
  {
    href: "/recommend",
    key: "recommend",
    label: "推荐",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9" />
      </svg>
    ),
  },
];

export default function TabNav({ current }: { current: string }) {
  return (
    <div className="flex justify-center py-4">
      <div className="inline-flex gap-1 bg-white rounded-2xl border border-[#e2e8f0] p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const active = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-[#1a9fff] text-white"
                  : "text-[#5f7d9a] hover:text-[#171a21] hover:bg-[#f3f5f7]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
