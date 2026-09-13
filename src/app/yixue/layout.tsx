import type { Metadata } from "next";
import Link from "next/link";
import YixueClientShell from "./ClientShell";
import { YIXUE_TOOLS } from "@/lib/toolNavData";

export const metadata: Metadata = {
  title: "易学排盘工具大全——八字紫微奇门六爻在线排盘",
  description: "言道国学易学工具中心：一站式提供八字排盘、紫微斗数、奇门遁甲、六爻起卦、梅花易数、大六壬、七政四余、玄空飞星等传统易学在线排盘工具，附万年历、老黄历、择日、罗盘等历法风水查询，功能免费使用，基于传统典籍整理，适合易学爱好者学习参考。",
};

export default function YixueLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <YixueClientShell>{children}</YixueClientShell>
      <section
        data-seo-nav
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">全部易学工具导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            言道国学易学工具中心：一站式提供八字排盘、紫微斗数、奇门遁甲、六爻起卦、梅花易数、大六壬、七政四余、玄空飞星等传统易学在线排盘工具，附万年历、老黄历、择日、罗盘等历法风水查询，全部免费使用。
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {YIXUE_TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-lg bg-[#f7f2fb] px-2 py-1.5 text-[11px] font-semibold text-gray-700"
              >
                {t.name}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            排盘结果基于传统典籍与现代历法推算整理，仅供传统文化学习与研究参考。登录后排盘记录自动云端保存，支持历史调取与多端同步。零基础用户建议先到学习专区了解基础概念，再对照工具排盘结果学习；每款工具页面均附使用说明与术语解释。
          </p>
          <div className="mt-3 rounded-lg bg-[#f9f9f9] p-2.5">
            <p className="mb-1 text-[11px] font-semibold text-gray-600">常见问题</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：排盘工具收费吗？答：全部工具免费在线使用，无需注册即可排盘，登录后可保存历史记录。</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：排盘结果可以作为决策依据吗？答：不可以，结果仅供传统文化学习参考，不构成任何专业建议。</p>
            <p className="text-[11px] leading-relaxed text-gray-500">问：手机上可以用吗？答：可以，网页版自适应手机屏幕，也可下载APP离线使用全部工具。</p>
          </div>
        </div>
      </section>
    </>
  );
}
