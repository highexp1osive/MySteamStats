import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-[#e2e8f0] px-6 py-3">
      <Link href="/" className="flex items-center gap-2 text-[#171a21] hover:text-[#1a9fff] transition w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="text-lg font-bold">MySteamStats</span>
      </Link>
    </header>
  );
}
