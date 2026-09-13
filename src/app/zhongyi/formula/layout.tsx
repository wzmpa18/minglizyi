import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "经典方剂库——方剂组成功效在线查询｜言道国学",
  description: "经典方剂库：按方名或主治查询方剂的组成、剂量、功用与主治，附方歌与出处，古籍记载剂量为非标准化剂量，仅供学习参考，临床用药请遵医嘱，免费在线使用，内容整理自传统典籍，仅供文化学习参考。",
};

// TOOL_SEO_GROUP
const ZHONGYI_TOOLS = [
  { href: "/zhongyi/ai/", name: "AI中医问答", desc: "AI中医问答：向AI助手咨询中医基础概念、药材功效、方剂组成与典籍出处等问题，附学习建议，回答基于公开中医资料整理，仅供学习参考，不构成诊疗建议，身体不适请线下就医。" },
  { href: "/zhongyi/bianzheng/", name: "辨证学习", desc: "中医辨证学习：输入症状进行辨证分析练习，对照八纲辨证、脏腑辨证与六经辨证思路，附常见证型辨析要点，基于《中医诊断学》体系整理，适合中医专业学生与自学者练习辨证思维。" },
  { href: "/zhongyi/classic/", name: "中医典籍", desc: "中医典籍在线阅读：《黄帝内经》《伤寒论》《金匮要略》等经典医书原文查阅，支持搜索与分篇浏览，附典籍导读与阅读顺序建议，适合中医学习者研读原始文献。" },
  { href: "/zhongyi/constitution/", name: "中医体质测评", desc: "中医体质测评：按标准体质量表自测体质倾向，输出九种体质（平和、气虚、阳虚、阴虚、痰湿、湿热、血瘀、气郁、特禀）结果与调理建议，附体质辨识知识讲解，适合了解中医体质学说。" },
  { href: "/zhongyi/diagnosis/", name: "中医智能问诊", desc: "中医智能问诊：选择性别与症状后获得证候分析参考，含妇科专项症状，输出可能的证型与调理方向，附问诊说明，结果仅供学习参考，不能替代执业医师诊断。" },
  { href: "/zhongyi/exam/", name: "医考题库", desc: "医考题库在线刷题：总题数、已练习、正确率与学习天数统计，按科目分章节练习，支持错题本与收藏，题目附答案解析，覆盖中医基础理论、中药学、方剂学、针灸学等科目，适合医考备考。" },
  { href: "/zhongyi/formula/", name: "经典方剂库", desc: "经典方剂库：按方名或主治查询方剂的组成、剂量、功用与主治，附方歌与出处，古籍记载剂量为非标准化剂量，仅供学习参考，临床用药请遵医嘱。" },
  { href: "/zhongyi/herb/", name: "中药库", desc: "中药库：按药名查询性味归经、功效主治与用法注意，含毒性药材标注，支持分类浏览，附中药学习记忆方法，内容基于《中药学》教材整理，仅供学习参考。" },
  { href: "/zhongyi/meridian/", name: "经络穴位", desc: "经络穴位查询：十二正经与任督二脉的循行路线、常用穴位定位与主治功效，附标准经络图参考，基于《经络腧穴学》整理，适合针灸推拿学习与穴位速查。" },
  { href: "/zhongyi/shanghan/", name: "伤寒论辨证学习", desc: "伤寒论学习：输入症状对照六经辨证证型，附各方证的条文出处与鉴别要点，采用证型对照学习模式，基于《伤寒论》原文整理，适合经典方证学习与考研复习。" },
  { href: "/zhongyi/wenzhen/", name: "智能问诊", desc: "中医智能问诊进阶版：输入症状组合获得更完整的辨证分析与证型鉴别参考，会员可解锁完整结果，附辨证思路讲解，内容仅供中医学习参考，不构成诊疗建议。" },
  { href: "/zhongyi/yangsheng/", name: "中医养生", desc: "中医养生参考：按季节与主题整理养生功法、起居饮食与情志调摄建议，附八段锦、太极拳等传统功法简介，内容基于中医养生理论整理，适合日常养生参考学习。" },
  { href: "/zhongyi/zhenggu/", name: "正骨专区", desc: "正骨专区：中华非遗正骨流派知识整理，含正骨手法原理、流派传承与知识点学习，内容仅供专业了解，正骨操作须由专业医师进行，请勿自行模仿。" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section data-seo-nav style={{ maxWidth: "420px", margin: "0 auto", padding: "12px 12px 64px", backgroundColor: "#f5f5f5" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(74,43,112,.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2D1A3E", margin: "0 0 8px" }}>工具说明</h2>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: "0 0 8px" }}>经典方剂库：按方名或主治查询方剂的组成、剂量、功用与主治，附方歌与出处，古籍记载剂量为非标准化剂量，仅供学习参考，临床用药请遵医嘱。</p>
          <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6B5B80", margin: 0 }}>本工具免费在线使用，无需下载安装，计算即时完成；登录后可保存与同步历史记录。内容基于传统典籍与现代历法推算整理，仅供传统文化学习与研究参考，不构成医疗、投资或其他专业建议。</p>
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
