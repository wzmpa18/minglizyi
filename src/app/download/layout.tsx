import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "言道国学APP下载——安卓苹果全平台安装",
  description: "言道国学APP官方下载页：安卓APK直装与苹果App Store下载入口，一个应用集成八字、紫微斗数、奇门遁甲、七政四余等易学排盘工具与中医学习中心，离线可用、无强制广告，下载安装即可使用全部基础排盘功能。",
};

const LINKS: Array<[string, string, string]> = [
  ["/yixue/", "易学工具中心", "八字、紫微、奇门、六爻、七政四余等30余个排盘工具"],
  ["/zhongyi/", "中医学习中心", "智能问诊、中药库、方剂库、经络穴位与医考题库"],
  ["/academy/yixue/", "易学学习专区", "章节化知识点、章节练习与错题复习"],
  ["/academy/yikao/", "医考学习专区", "中医医考知识点与在线刷题"],
  ["/yixue/wannianli/", "万年历", "公历农历对照与干支节气查询"],
  ["/yixue/huangli/", "老黄历", "每日宜忌与吉神凶煞查询"],
  ["/ai/", "言道AI助手", "易学中医概念智能问答"],
  ["/membership/", "会员中心", "套餐与权益说明"],
];

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section data-seo-nav style={{ maxWidth: "680px", margin: "0 auto", padding: "12px 16px 64px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2D1A3E", margin: "0 0 10px" }}>言道国学APP说明</h2>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>言道国学APP官方下载页：安卓APK直装与苹果App Store下载入口，一个应用集成八字、紫微斗数、奇门遁甲、七政四余等易学排盘工具与中医学习中心，离线可用、无强制广告，下载安装即可使用全部基础排盘功能。</p>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>安卓用户可直接下载APK安装（需在系统设置中允许安装未知来源应用），苹果用户跳转App Store安装；网页版与本页列出的全部功能均可在线免费使用，账号数据多端自动同步。</p>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>站内功能导航</h3>
          {LINKS.map(([href, name, desc]) => (
            <p key={href} style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.7 }}>
              <Link href={href} style={{ color: "#5E2293", fontWeight: 600 }}>{name}</Link>
              <span style={{ color: "#6B5B80" }}>——{desc}</span>
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
