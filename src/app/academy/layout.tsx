import type { Metadata } from "next";
import Link from "next/link";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

export const metadata: Metadata = {
  title: "学习中心——章节知识点练习与错题复习",
  description: "言道国学学习中心：易学与中医章节化知识体系，提供知识点学习、章节练习、错题复习、学习笔记与收藏功能，学习进度自动记录，支持易学基础、八字、紫微斗数、七政四余、中医基础与医考等多学科，适合系统化自学打卡。",
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">学习专区导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            言道国学学习中心：易学与中医章节化知识体系，提供知识点学习、章节练习、错题复习、学习笔记与收藏功能，学习进度自动记录，适合系统化自学打卡。
          </p>
          <div className="flex flex-col gap-1.5">
            <Link href="/academy/start/" className="rounded-lg bg-[#edf7f2] px-2.5 py-2 text-[11.5px] font-semibold text-[#267364]">中医学习入门课——无需登录，阅读、自测与本机错题重练</Link>
            <Link href="/academy/astronomy/" className="rounded-lg bg-[#edf7f2] px-2.5 py-2 text-[11.5px] font-semibold text-[#267364]">天文馆——日月行星、观测自测与本机笔记</Link>
            <Link href="/zhongyi/yunqi/" className="rounded-lg bg-[#edf7f2] px-2.5 py-2 text-[11.5px] font-semibold text-[#267364]">五运六气——主客气对照、原典阅读与连续听学</Link>
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
            <Link
              href="/academy/yikao/"
              className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11.5px] leading-snug"
            >
              <span className="font-semibold text-gray-700">医考学习专区</span>
              <span className="text-gray-500">——中医医考知识点与章节刷题、错题复习</span>
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            入门课内容随应用提供，进度仅保存在本机；进阶学习与题库按页面要求联网、登录使用。账号学习记录与入门课进度分别管理。学习记录不属于执业资格证明。
          </p>
        </div>
      </section>
    </>
  );
}
