import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MySteamStats - Steam 游戏数据分析",
  description: "连接你的 Steam 账号，深度分析你的游戏人生",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-[#f3f5f7] text-[#171a21] min-h-screen`}>
        <Header />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
