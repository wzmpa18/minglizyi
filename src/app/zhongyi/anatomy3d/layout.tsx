import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D人体解剖分层学习｜言道国学",
  description: "可旋转、缩放并切换骨骼、脏腑、肌肉层的人体结构离线学习工具。",
};

export default function Anatomy3DLayout({ children }: { children: React.ReactNode }) {
  return children;
}
