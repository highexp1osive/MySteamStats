"use client";

import { useEffect, useState } from "react";

export default function SteamLoginButton() {
  const [user, setUser] = useState<{
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="w-8 h-8 bg-[#e2e8f0] rounded-full animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
        )}
        <span className="text-sm text-[#5f7d9a]">{user.displayName}</span>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="bg-[#1a9fff] hover:bg-[#1789dd] text-white px-4 py-1.5 rounded-full text-sm font-medium transition"
    >
      连接 Steam
    </a>
  );
}
