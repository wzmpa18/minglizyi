import type { Metadata } from "next";
import Link from "next/link";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

export const metadata: Metadata = {
  title: "易学学习专区——学科知识点与题库练习｜言道国学",
  description: "易学学习专区：涵盖易学基础、八字基础、紫微斗数、七政四余、奇门遁甲、六爻、梅花易数、大六壬与历法等学科，每科提供章节目录、知识点讲解、术语解释与章节练习，题目附答案解析，学习进度云端同步，适合零基础系统学习。",
};

export default function YixueAcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">易学学科导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            易学学习专区：涵盖易学基础、八字基础、紫微斗数、七政四余、奇门遁甲、六爻、梅花易数、大六壬与历法等学科，每科提供章节目录、知识点讲解、术语解释与章节练习，题目附答案解析，适合零基础系统学习。
          </p>
          <div className="flex flex-col gap-1.5">
            {YIXUE_SUBJECTS.map((s) => (
              <Link
                key={s.key}
                href={`/academy/yixue/${s.key}/`}
                className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11.5px] leading-snug"
              >
                <span className="font-semibold text-gray-700">{s.name}</span>
                <span className="text-gray-500">——{s.desc}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            学科页按章节组织知识点，支持逐条打卡、章节练习、错题复习与学习笔记；内容整理自传统典籍，仅供文化学习参考。
          </p>
        </div>
      </section>
    </>
  );
}
