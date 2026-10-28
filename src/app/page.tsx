// v25.0.86 SEO-BING：首页服务端 wrapper——渲染 HomePage 客户端组件 + 全站导航区块
import HomePage from "./HomePage";
import Link from "next/link";
import { YIXUE_TOOLS, ZHONGYI_TOOLS } from "@/lib/toolNavData";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";
import { PUBLIC_PROMOTION_ENABLED } from "@/lib/releaseFeatures";

export default function Page() {
  return (
    <>
      <HomePage />
      <section className="mx-auto w-full px-3 pb-8" style={{maxWidth:"420px",backgroundColor:"#f5f5f5"}}>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-bold text-gray-800">读经典、看人体、找同好</h2>
          <p className="mb-3 text-xs leading-relaxed text-gray-500">言道国学把原典、课程笔记、经络图谱与学习交流放在同一平台，既可逐步研读，也能保存资料后离线学习。</p>
          <div className="grid grid-cols-2 gap-2 text-xs leading-relaxed">
            <Link className="rounded-xl bg-[#f7f2fb] p-3" href="/zhongyi/anatomy3d/"><strong>三维人体与经络</strong><br/>旋转观察、分层学习，沿经络查看穴位与已收录图谱、动画。</Link>
            <Link className="rounded-xl bg-[#f7f2fb] p-3" href="/zhongyi/ni-study/"><strong>倪师课程自学</strong><br/>按原有讲次与篇目听学、做笔记、记进度，听完可进入下一讲。</Link>
            <Link className="rounded-xl bg-[#f7f2fb] p-3" href="/discover/tongchen/"><strong>同辰雅集</strong><br/>成年人自愿选择出生年月日与时辰条件，寻找愿意交流的学习同好。</Link>
            <Link className="rounded-xl bg-[#f7f2fb] p-3" href="/discover/"><strong>同证主题研习与社交</strong><br/>围绕资料主题交流，使用动态、好友聊天和学习群；不公开私人档案。</Link>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">资料可保存后离线阅读；三维人体继续按现有会员权益开放。{PUBLIC_PROMOTION_ENABLED&&<>分享码只记录邀请来源；官网来源经核验的合格直接订单按已确认规则计佣（本人直接15%，二级0），商店下载和商店订单不计佣。<Link className="font-semibold text-[#713aa1] underline" href="/invite/">查看邀请与推广规则</Link></>}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-gray-400">同辰与同证服务以自愿加入和当期服务开放状态为准；不作命运、婚恋或健康判断。中医内容用于古籍与传统文化学习，不提供医疗咨询、诊断、处方或售药。</p>
        </div>
      </section>
      <section
        data-seo-nav
        className="mx-auto w-full px-3 pb-12 pt-1"
        style={{ maxWidth: "420px", backgroundColor: "#f5f5f5" }}
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1.5 text-[15px] font-bold text-gray-800">言道国学——在线工具与学习中心导航</h2>
          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            言道国学提供八字、紫微斗数、奇门遁甲、六爻、七政四余、玄空飞星等免费在线排盘工具，附万年历、老黄历、择日、罗盘等历法风水查询；中医板块含文献助学、体质测评、中药库、方剂库、经络穴位查询与医考题库；学习中心提供章节化知识点、章节练习与错题复习，全部基础功能免费使用。
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
