import type { Metadata } from "next";
import LearningShareRedirect from '@/components/LearningShareRedirect';
import { PUBLIC_PROMOTION_ENABLED } from "@/lib/releaseFeatures";

export const metadata: Metadata = {
  title: "邀请有礼——邀请好友共建言道国学学习圈",
  description: "言道国学邀请中心：生成专属邀请海报与邀请链接，邀请好友注册使用言道国学，共同学习易学与中医传统文化。",
  robots: { index: false, follow: true },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return PUBLIC_PROMOTION_ENABLED ? children : <LearningShareRedirect />;
}
