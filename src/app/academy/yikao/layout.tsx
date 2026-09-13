import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "医考学习专区——中医医考知识点与刷题｜言道国学",
  description: "医考学习专区：整理中医执业医师与医考相关知识点，提供章节化学习、每日练习、错题复习与收藏功能，题目覆盖中医基础理论、中药学、方剂学、针灸学等科目，附答案解析，适合医考备考与中医在校生复习使用。",
};

const YIKAO_LINKS: Array<[string, string, string]> = [
  ["/yikao/", "医考免费题库中心", "五科1447题，网页直接做题无需注册"],
  ["/yikao/zhongyi-jichu-lilun-mianfei-lianxi.html", "中医基础理论免费练习", "章节化知识点练习与答案解析"],
  ["/yikao/zhongyaoxue-tiku.html", "中药学题库", "中药性味归经与功效主治刷题"],
  ["/yikao/fangji-tiku.html", "方剂学题库", "方剂组成功用主治与方歌练习"],
  ["/yikao/zhenjiu-tiku.html", "针灸学题库", "经络腧穴与针刺法知识点刷题"],
  ["/yikao/zhongyi-zhenduan-tiku.html", "中医诊断学题库", "四诊与辨证论治章节练习"],
  ["/yikao/meirian-lianxi.html", "每日一练", "每天一组医考精选题保持手感"],
  ["/yikao/cuoti-fuxi.html", "错题复习方法", "错题本使用与复习节奏安排"],
  ["/yikao/zhangjie-lianxi.html", "章节练习", "按教材章节逐章巩固知识点"],
  ["/zixue/", "中医自学中心", "三阶段学习路线图与基础概念讲解"],
];

export default function YikaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">医考学习导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            医考学习专区：整理中医执业医师与医考相关知识点，提供章节化学习、每日练习、错题复习与收藏功能，题目覆盖中医基础理论、中药学、方剂学、针灸学等科目，附答案解析，适合医考备考与中医在校生复习使用。
          </p>
          <div className="flex flex-col gap-1.5">
            {YIKAO_LINKS.map(([href, name, desc]) => (
              <Link key={href} href={href} className="rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11.5px] leading-snug">
                <span className="font-semibold text-gray-700">{name}</span>
                <span className="text-gray-500">——{desc}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            题目整理自公开教辅资料，答案解析仅供复习参考；实际考试内容以官方大纲为准。做题记录保存在个人账号下，支持错题自动归集。
          </p>
        </div>
      </section>
    </>
  );
}
