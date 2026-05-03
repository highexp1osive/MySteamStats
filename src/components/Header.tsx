"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SteamLoginButton from "./SteamLoginButton";

export default function Header() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href
      ? "text-orange-500"
      : "text-gray-400 hover:text-white transition";

  return (
    <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link
        href="/"
        className="text-xl font-bold text-orange-500"
      >
        MySteamStats
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          游戏库
        </Link>
        <Link href="/galaxy" className={linkClass("/galaxy")}>
          星系
        </Link>
        <Link href="/analysis" className={linkClass("/analysis")}>
          AI 锐评
        </Link>
        <Link href="/recommend" className={linkClass("/recommend")}>
          推荐
        </Link>
        <SteamLoginButton />
      </nav>
    </header>
  );
}
