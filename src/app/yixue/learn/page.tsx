"use client";

import { useMemo, useState } from "react";
import { ResourceDiscussion } from "@/components/ResourceDiscussion";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

const CLASSIC_GUIDE: Record<string, string[]> = {
  yixue_basic: ["周易", "易传", "周易本义"],
  bazi: ["渊海子平", "三命通会", "滴天髓", "穷通宝鉴"],
  ziwei: ["紫微斗数全书", "太微赋", "斗数骨髓赋"],
  qizheng: ["果老星宗", "星学大成", "七政四余相关古法"],
  qimen: ["烟波钓叟歌", "奇门遁甲统宗", "御定奇门宝鉴"],
  liuyao: ["火珠林", "卜筮正宗", "增删卜易"],
  meihua: ["梅花易数", "皇极经世"],
  daliuren: ["六壬大全", "大六壬指南", "壬归"],
  calendar: ["协纪辨方书", "玉匣记", "历法节气资料"],
};

export default function YixueLearnPage() {
  const [query, setQuery] = useState("");
  const [discussionKey, setDiscussionKey] = useState("");
  const subjects = useMemo(() => YIXUE_SUBJECTS.filter((subject) => {
    const blob = `${subject.name}${subject.desc}${subject.intro}${subject.categories.join("")}${(CLASSIC_GUIDE[subject.key] || []).join("")}`;
    return !query.trim() || blob.includes(query.trim());
  }), [query]);

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-gray-50 px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900">易学学习与典籍分类</h1>
      <p className="mt-1 text-xs leading-5 text-gray-500">
        按学派进入现有章节、练习和资料；古籍原文只有完成来源、完整性和错字核验后才开放阅读。
      </p>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学派、课程或典籍"
        className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none" />

      <div className="mt-4 space-y-3">
        {subjects.map((subject) => {
          const classics = CLASSIC_GUIDE[subject.key] || [];
          const discussionOpen = discussionKey === subject.key;
          const category = subject.categories[0] || subject.name;
          return (
            <section key={subject.key} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-100 font-bold text-purple-800">{subject.icon}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-gray-800">{subject.name}</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{subject.desc}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {classics.map((name) => <span key={name} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-800">《{name}》</span>)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`/academy/learn?track=yixue&category=${encodeURIComponent(category)}`}
                    className="rounded-lg bg-purple-700 px-3 py-2 text-center text-xs font-semibold text-white">进入学习</a>
                  <button type="button" onClick={() => setDiscussionKey(discussionOpen ? "" : subject.key)}
                    className="rounded-lg border border-purple-700 bg-white px-3 py-2 text-xs font-semibold text-purple-800">💬 学派交流</button>
                </div>
              </div>
              {discussionOpen && <ResourceDiscussion resourceType="yixue" resourceId={`learn:${subject.key}`} title={`${subject.name}学习讨论`} />}
            </section>
          );
        })}
      </div>

      <p className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
        书名用于建立学派阅读目录，不代表原文已全部发布。现代课程、现代注释和整理版需另行核验授权；未经核验的资料不会混入正式书库。
      </p>
    </main>
  );
}
