import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

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
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
