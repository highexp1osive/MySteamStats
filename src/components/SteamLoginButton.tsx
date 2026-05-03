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
    return (
      <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-gray-300">
          {user.displayName}
        </span>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
    >
      连接 Steam
    </a>
  );
}
