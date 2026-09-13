import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "经典医籍阅读——中医经典著作书单",
  description: "经典医籍阅读列表：整理《黄帝内经》《伤寒论》《金匮要略》《温病条辨》等中医经典著作，建议按序研读的入门书单与阅读指引，附原文查阅入口，适合中医自学者的典籍学习路线参考。",
};

const READS: Array<[string, string, string]> = [
  ["/zhongyi/classic/", "中医典籍在线阅读", "经典医书原文分篇浏览与检索入口"],
  ["/zhongyi/herb/", "中药库", "中药性味归经与功效主治查询"],
  ["/zhongyi/formula/", "经典方剂库", "方剂组成、功用主治与方歌对照"],
  ["/zhongyi/meridian/", "经络穴位", "十二经络循行与穴位定位主治"],
  ["/zhongyi/shanghan/", "伤寒论辨证学习", "六经证型对照与条文出处学习"],
  ["/zhongyi/constitution/", "中医体质测评", "九种体质自测与调理建议"],
];

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section data-seo-nav style={{ maxWidth: "680px", margin: "0 auto", padding: "12px 16px 64px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2D1A3E", margin: "0 0 10px" }}>经典医籍阅读指引</h2>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>经典医籍阅读列表：整理《黄帝内经》《伤寒论》《金匮要略》《温病条辨》等中医经典著作，建议按序研读的入门书单与阅读指引，附原文查阅入口，适合中医自学者的典籍学习路线参考。</p>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>中医自学建议从《中医基础理论》入门，再依次研读《黄帝内经》选篇与《伤寒论》，配合中药、方剂基础同步学习；本站典籍原文均支持分篇检索，阅读中遇到的名词可在中药库与经络穴位工具中即时查询。</p>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>配套学习工具</h3>
          {READS.map(([href, name, desc]) => (
            <p key={href} style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.7 }}>
              <Link href={href} style={{ color: "#5E2293", fontWeight: 600 }}>{name}</Link>
              <span style={{ color: "#6B5B80" }}>——{desc}</span>
            </p>
          ))}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>常见问题</h3>
          <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>典籍原文免费阅读吗？</strong>免费。22部经典医籍原文均可在线分篇阅读，支持检索与书签，无需会员。</p>
          <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>零基础从哪本书读起？</strong>建议先读《中医基础理论》类入门材料，再选《黄帝内经》选篇与《伤寒论》配合译注研读，遇到名词用中药库、方剂库随时查。</p>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>古文看不懂怎么办？</strong>典籍页面提供分篇浏览与关键词检索，可先用AI中医助手查询概念解释，再回到原文对照理解。</p>
          <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.8, color: "#6B5B80" }}>阅读进度与书签保存在个人账号下，支持多端同步；医学生在读原著的同时，可配合医考学习专区的章节练习检验理解程度。典籍版本以通行校注本为底本整理，如与纸本有出入请以纸本为准。</p>
        </div>
      </section>
    </>
  );
}
