import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "会员中心——言道国学套餐与权益说明",
  description: "言道国学会员中心：查看当前会员状态、会员套餐与权益说明，会员可解锁完整问诊分析、学习数据云同步等进阶功能，基础排盘与学习功能保持免费，免费在线使用，内容整理自传统典籍，仅供文化学习参考。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
