import type { Metadata } from "next";
import Link from "next/link";
import {ZHONGYI_TOOLS} from "@/lib/toolNavData";

export const metadata: Metadata = {
  title: "经络穴位——十二经络循行与穴位查询｜言道国学",
  description: "经络穴位查询：十二正经与任督二脉的循行资料、穴名与归经查询，提供经络学习图、开放图示署名和来源链接；本库整理文字尚待逐条复核，适合文献学习与图文对照，免费在线使用，内容整理自传统典籍，仅供文化学习参考。",
};

// TOOL_SEO_GROUP


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section data-seo-nav style={{ maxWidth: "420px", margin: "0 auto", padding: "12px 12px 64px", backgroundColor: "#f5f5f5" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2D1A3E", margin: "0 0 8px" }}>工具说明</h2>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>经络穴位查询：十二正经与任督二脉的循行资料、穴名与归经查询，提供经络学习图、开放图示署名和来源链接；本库整理文字尚待逐条复核，适合文献学习与图文对照。</p>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>本页用于中医文献与知识学习。资料范围、来源及复核状态以页面标注为准；学习记录的保存方式以具体功能说明为准。古籍记载不能直接用作个人诊疗或操作依据。</p>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>全部中医工具导航</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ZHONGYI_TOOLS.map((g) => (
              <Link key={g.href} href={g.href} style={{ display: "block", background: "#F3ECFA", borderRadius: 12, padding: "8px 10px" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5E2293" }}>{g.name}</span>
                <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.6, color: "#6B5B80" }}>{g.desc.slice(0, 42)}…</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
