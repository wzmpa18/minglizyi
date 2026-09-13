// v25.0.80 IOS-4.3B-RECOVERY：易学学习中心学科页（静态导出 wrapper）
// v25.0.86 SEO-BING：服务端渲染学科简介/专题目录/相关学科内链（数据全部来自既有配置，提升抓取内容量）
import type { Metadata } from "next";
import Link from "next/link";
import ClientPage from "./ClientPage";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

export function generateStaticParams() {
  return YIXUE_SUBJECTS.map((s) => ({ key: s.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const s = YIXUE_SUBJECTS.find((x) => x.key === key);
  if (!s) return {};
  return {
    title: `${s.name}学习专区——${s.desc}｜言道国学`,
    description: `${s.intro}附章节目录、知识点讲解、章节练习与错题复习，题目含答案解析，学习进度自动记录。`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const s = YIXUE_SUBJECTS.find((x) => x.key === key);
  if (!s) return <ClientPage />;
  const topics = s.topics || [];
  const related = YIXUE_SUBJECTS.filter((x) => x.key !== key);

  return (
    <>
      <ClientPage />
      <section
        className="mx-auto w-full px-3 pb-10 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-[15px] font-bold text-gray-800">{s.name}学习专区说明</h2>
          <p className="mb-2 text-[12px] leading-relaxed text-gray-600">
            {s.intro}本专区按章节组织知识点：每条知识点附术语解释与典籍出处，章节练习与专题练习均提供答案解析，支持逐条打卡、错题复习与学习笔记，学习进度自动记录，适合零基础自学者系统化学习。
          </p>
          <p className="text-[12px] leading-relaxed text-gray-600">课程结构：{s.structure.join("；")}。</p>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
            学习路径建议：先通读课程简介掌握整体框架，再按章节顺序逐条学习知识点并完成打卡；每学完一章及时做章节练习，错题自动进入错题复习；重要内容可添加学习笔记，考前集中过一遍错题与笔记即可形成完整复习闭环。
          </p>

          {topics.length > 0 && (
            <div className="mt-3">
              <h3 className="mb-1.5 text-[13px] font-bold text-gray-700">学习专题目录（{topics.length}个）</h3>
              <ol className="list-decimal pl-5">
                {topics.map((t) => (
                  <li key={t.key} className="py-0.5 text-[12px] leading-relaxed text-gray-600">
                    {t.name}
                    {t.desc ? <span className="text-gray-400">——{t.desc}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-3">
            <h3 className="mb-1.5 text-[13px] font-bold text-gray-700">相关学科学习专区</h3>
            <div className="flex flex-col gap-1.5">
              {related.map((x) => (
                <Link
                  key={x.key}
                  href={`/academy/yixue/${x.key}/`}
                  className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11.5px] leading-snug"
                >
                  <span className="font-semibold text-gray-700">{x.name}</span>
                  <span className="text-gray-500">——{x.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            内容整理自传统典籍与公开教学资料，仅供传统文化学习参考。学习进度与打卡记录保存在个人账号下，更换设备登录后自动同步。
          </p>
        </div>
      </section>
    </>
  );
}
