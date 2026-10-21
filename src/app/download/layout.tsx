import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "言道国学APP下载——安卓苹果全平台安装",
  description: "言道国学APP官方下载页：安卓APK官方下载与苹果测试状态说明，一个应用集成八字、紫微斗数、奇门遁甲、七政四余等易学排盘工具与中医学习中心，学习工具、典籍研读与记录功能按实际渠道提供，使用业务功能前需登录并完成手机号验证。",
};

const LINKS: Array<[string, string, string]> = [
  ["/yixue/", "易学工具中心", "八字、紫微、奇门、六爻、七政四余等30余个排盘工具"],
  ["/zhongyi/", "中医学习中心", "辨证学习、中药性味归经、方剂、经络穴位与医考练习"],
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
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>言道国学APP官方下载页：安卓APK官方下载与苹果测试状态说明，一个应用集成八字、紫微斗数、奇门遁甲、七政四余等易学排盘工具与中医学习中心，学习工具、典籍研读与记录功能按实际渠道提供，使用业务功能前需登录并完成手机号验证。</p>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>安卓用户可下载官方APK，按系统提示完成安装。苹果现处于TestFlight测试阶段，正式上架以商店实际状态为准；会员、AI点数和部分学习内容按对应页面提供，原账号权益保留。</p>
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
