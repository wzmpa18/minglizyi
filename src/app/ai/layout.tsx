import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "言道AI助手——易学中医智能问答工具",
  description: "言道AI助手：基于人工智能的传统文化问答工具，可咨询易学概念、中医基础、典籍出处与学习路径等问题，回答仅供文化学习参考，不构成医疗建议或决策依据。",
};

const YIXUE_LINKS: Array<[string, string, string]> = [
  ["/yixue/bazi/", "八字排盘", "输入出生时间生成四柱命盘，含十神、大运流年"],
  ["/yixue/ziwei/", "紫微斗数", "十四主星安星与十二宫位命盘在线排盘"],
  ["/yixue/qizheng/", "七政四余", "十一曜、二十八宿与十二人事宫专业星命盘"],
  ["/yixue/liuyao/", "六爻排盘", "摇卦起卦自动装卦纳甲，含用神旺衰参考"],
  ["/yixue/wannianli/", "万年历", "公历农历对照、干支节气节日一键查询"],
  ["/yixue/huangli/", "老黄历", "每日宜忌、吉神凶煞与冲煞生肖查询"],
];

const ZHONGYI_LINKS: Array<[string, string, string]> = [
  ["/zhongyi/herb/", "中药库", "按药名查询性味归经与功效主治"],
  ["/zhongyi/formula/", "经典方剂库", "方剂组成、功用主治与方歌查询"],
  ["/zhongyi/meridian/", "经络穴位", "十二经络循行与穴位定位主治"],
  ["/zhongyi/classic/", "中医典籍", "经典医书原文在线阅读与检索"],
];

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section data-seo-nav style={{ maxWidth: "680px", margin: "0 auto", padding: "12px 16px 64px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#2D1A3E", margin: "0 0 10px" }}>言道AI助手说明</h2>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>言道AI助手：基于人工智能的传统文化问答工具，可咨询易学概念、中医基础、典籍出处与学习路径等问题，回答仅供文化学习参考，不构成医疗建议或决策依据。</p>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>使用时直接输入问题即可获得解答，支持追问与多轮对话；问答记录保存在个人账号下。涉及健康与疾病的问题请务必线下就医，AI回答不能替代执业医师诊断。</p>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>热门易学工具</h3>
          {YIXUE_LINKS.map(([href, name, desc]) => (
            <p key={href} style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.7 }}>
              <Link href={href} style={{ color: "#5E2293", fontWeight: 600 }}>{name}</Link>
              <span style={{ color: "#6B5B80" }}>——{desc}</span>
            </p>
          ))}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>热门中医工具</h3>
          {ZHONGYI_LINKS.map(([href, name, desc]) => (
            <p key={href} style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.7 }}>
              <Link href={href} style={{ color: "#5E2293", fontWeight: 600 }}>{name}</Link>
              <span style={{ color: "#6B5B80" }}>——{desc}</span>
            </p>
          ))}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#5E2293", margin: "14px 0 8px" }}>常见问题</h3>
          <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>AI回答的内容可靠吗？</strong>AI回答基于公开传统文化资料整理，适合概念解释与学习路径指引；涉及典籍原文请以原书为准，涉及健康问题请线下就医。</p>
          <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>使用AI助手收费吗？</strong>每日有免费提问额度，登录后可用；会员解锁更高频次与更长上下文的深度问答。</p>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: "#6B5B80" }}><strong style={{ color: "#2D1A3E" }}>AI会做命运预测吗？</strong>不会。AI助手定位为文化学习工具，只解释概念、典籍与学习方法，不提供吉凶判断与决策建议。</p>
        </div>
      </section>
    </>
  );
}
