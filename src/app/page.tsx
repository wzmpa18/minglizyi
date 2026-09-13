// v25.0.86 SEO-BING：首页服务端 wrapper——渲染 HomePage 客户端组件 + 全站导航区块
import HomePage from "./HomePage";
import Link from "next/link";
import { YIXUE_TOOLS, ZHONGYI_TOOLS } from "@/lib/toolNavData";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

export default function Page() {
  return (
    <>
      <HomePage />
      <section
        data-seo-nav
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">言道国学——在线工具与学习中心导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            言道国学提供八字、紫微斗数、奇门遁甲、六爻、七政四余、玄空飞星等免费在线排盘工具，附万年历、老黄历、择日、罗盘等历法风水查询；中医板块含智能问诊、体质测评、中药库、方剂库、经络穴位查询与医考题库；学习中心提供章节化知识点、章节练习与错题复习，全部基础功能免费使用。
          </p>

          <h3 className="mb-1.5 text-[13px] font-bold text-gray-700">易学排盘工具</h3>
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {YIXUE_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg bg-[#f7f2fb] px-1.5 py-1.5 text-center text-[10.5px] font-semibold text-gray-700"
              >
                {t.name}
              </Link>
            ))}
          </div>

          <h3 className="mb-1.5 text-[13px] font-bold text-gray-700">中医学习工具</h3>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {ZHONGYI_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg bg-[#f0f7f0] px-1.5 py-1.5 text-center text-[10.5px] font-semibold text-gray-700"
              >
                {t.name}
              </Link>
            ))}
          </div>

          <h3 className="mb-1.5 text-[13px] font-bold text-gray-700">学习专区</h3>
          <div className="mb-3 flex flex-col gap-1.5">
            {YIXUE_SUBJECTS.map((s) => (
              <Link
                key={s.key}
                href={`/academy/yixue/${s.key}/`}
                className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11px] leading-snug"
              >
                <span className="font-semibold text-gray-700">{s.name}</span>
                <span className="text-gray-500">——{s.desc}</span>
              </Link>
            ))}
            <Link href="/academy/yikao/" className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11px] leading-snug">
              <span className="font-semibold text-gray-700">医考学习专区</span>
              <span className="text-gray-500">——中医医考知识点与章节刷题</span>
            </Link>
          </div>

          <p className="text-[11px] leading-relaxed text-gray-400">
            排盘与查询工具基于传统典籍与现代历法推算整理，学习内容整理自公开教学资料，仅供传统文化学习与研究参考，不构成医疗建议或决策依据。
          </p>
        </div>
      </section>
    </>
  );
}
