import {InterfaceText} from "@/components/InterfaceControls";
import type { Metadata } from "next";
import Link from "next/link";
import ZhongyiClientShell from "./ClientShell";
import { ZHONGYI_TOOLS } from "@/lib/toolNavData";

export const metadata: Metadata = {
  title: "中医学习工具——典籍方剂经络体质一站式中心",
  description: "言道国医学习中心：提供辨证文献研习、术语对照、体质问卷学习、中医典籍阅读、中药库、经典方剂库、经络穴位查询与养生功法参考，另含医考题库练习，内容基于《黄帝内经》《伤寒论》等经典医籍整理，适合中医自学入门与进阶学习。",
};

export default function ZhongyiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ZhongyiClientShell>{children}</ZhongyiClientShell>
      <section
        data-seo-nav
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">全部中医工具导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            言道国医学习中心：提供辨证文献研习、术语对照、体质问卷学习、中医典籍阅读、中药库、经典方剂库、经络穴位查询与养生功法参考，另含医考题库练习，内容基于《黄帝内经》《伤寒论》等经典医籍整理，适合中医自学入门与进阶学习。
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ZHONGYI_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg bg-[#f7f2fb] px-2 py-1.5 text-[11px] font-semibold text-gray-700"
              >
                <InterfaceText text={t.name}/>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            内容基于经典医籍与《中药学》《方剂学》等教材整理，仅供学习参考，不构成诊疗建议；身体不适请及时线下就医，用药请遵医嘱。零基础用户可从原典导读与术语学习开始，再按章节学习基础理论，配合来源可核对的题目复习；问卷计分仅用于学习计分方法。
          </p>
          <div className="mt-3 rounded-lg bg-[#f9f9f9] p-2.5">
            <p className="mb-1 text-[11px] font-semibold text-gray-600">常见问题</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：文献学习能代替看医生吗？答：不能。关键词命中和问卷计分不是健康结论，身体不适请及时就医。</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：中药方剂信息可以照着用吗？答：不可以，古籍剂量为非标准化剂量，用药请遵医嘱。</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：零基础怎么开始学中医？答：先到中医自学中心按三阶段路线图学习，再配合题库与典籍阅读。</p>
          </div>
        </div>
      </section>
    </>
  );
}
