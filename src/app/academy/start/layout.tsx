import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "言道学习入门课与自测",
  description: "无需登录的资料阅读入门课，支持即时自测、解析、错题重练和本机学习进度。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
