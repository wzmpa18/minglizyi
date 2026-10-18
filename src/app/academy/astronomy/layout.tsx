import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "天文馆｜日月行星与观测学习",
  description: "按时间和地点计算日月行星的方位、高度、升落与月相，配合观察自测、私人笔记和历法学习入口。",
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
