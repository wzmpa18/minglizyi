"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollText, BookOpen, AlertTriangle } from "lucide-react";
import { SHANGHAN_SYNDROMES } from "@/algorithm-core";
import { BrandHeader } from "@/components/shared";

// ============================================================================
// 辨证学数据
// 典籍记载，仅供学习参考
// ============================================================================

interface SyndromeCard {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  formulas: string[];
  source: string;
}

// ---- 八纲辨证 ----
const BAGANG_SYNDROMES: SyndromeCard[] = [
  {
    id: "bg-1",
    name: "表证",
    description: "外邪侵犯肌表，病位浅，病程短，起病急。恶寒发热并见，头身疼痛，脉浮。",
    symptoms: ["恶寒发热", "头身疼痛", "鼻塞流涕", "咽喉痒痛", "脉浮"],
    formulas: ["麻黄汤", "桂枝汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-2",
    name: "里证",
    description: "病位深在脏腑、气血、骨髓，病程长。不恶寒反恶热，脏腑功能失调。",
    symptoms: ["壮热口渴", "烦躁不安", "腹痛便秘", "或泄泻", "脉沉"],
    formulas: ["白虎汤", "大承气汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-3",
    name: "寒证",
    description: "阴盛阳衰，机体功能活动减退。恶寒喜暖，口淡不渴，肢冷蜷卧。",
    symptoms: ["恶寒喜暖", "四肢不温", "口淡不渴", "小便清长", "脉沉迟"],
    formulas: ["理中汤", "四逆汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-4",
    name: "热证",
    description: "阳盛阴虚，机体功能活动亢进。发热喜凉，口渴饮冷，面红目赤。",
    symptoms: ["发热喜凉", "口渴饮冷", "面红目赤", "小便短黄", "脉数"],
    formulas: ["白虎汤", "黄连解毒汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-5",
    name: "虚证",
    description: "正气不足，机体功能减退。神疲乏力，面色无华，声低气怯。",
    symptoms: ["神疲乏力", "少气懒言", "自汗盗汗", "头晕目眩", "脉虚无力"],
    formulas: ["四君子汤", "四物汤", "六味地黄丸"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-6",
    name: "实证",
    description: "邪气亢盛，正气未衰，正邪交争剧烈。声高气粗，腹痛拒按。",
    symptoms: ["声高气粗", "胸腹胀满", "疼痛拒按", "大便秘结", "脉实有力"],
    formulas: ["大承气汤", "桃核承气汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-7",
    name: "阴证",
    description: "阴盛阳衰，机能衰退，脏腑功能下降。面色苍白或暗淡，身重蜷卧。",
    symptoms: ["面色苍白", "畏寒肢冷", "语声低微", "大便溏泄", "脉沉微细"],
    formulas: ["四逆汤", "理中汤"],
    source: "《景岳全书·传忠录》",
  },
  {
    id: "bg-8",
    name: "阳证",
    description: "阳盛阴衰，机能亢进，邪热壅盛。面红目赤，躁动不安，发热口渴。",
    symptoms: ["面红目赤", "躁动不安", "发热口渴", "大便秘结", "脉洪数"],
    formulas: ["白虎汤", "黄连解毒汤"],
    source: "《景岳全书·传忠录》",
  },
];

// ---- 脏腑辨证 ----
const ZANGFU_SYNDROMES: SyndromeCard[] = [
  {
    id: "zf-1",
    name: "心气虚",
    description: "心气不足，鼓动无力，心神失养。心悸怔忡，胸闷气短，活动后加重。",
    symptoms: ["心悸怔忡", "胸闷气短", "神疲乏力", "自汗", "面色淡白"],
    formulas: ["养心汤", "炙甘草汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-2",
    name: "心血虚",
    description: "心血不足，心失所养。心悸失眠，健忘多梦，面色无华。",
    symptoms: ["心悸失眠", "多梦易醒", "健忘", "面色淡白无华", "唇舌色淡"],
    formulas: ["归脾汤", "天王补心丹"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-3",
    name: "肝气郁结",
    description: "肝失疏泄，气机郁滞。情志抑郁，胸胁胀痛，善太息。",
    symptoms: ["情志抑郁", "胸胁胀痛", "善太息", "咽中如有物阻", "脉弦"],
    formulas: ["逍遥散", "柴胡疏肝散"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-4",
    name: "肝阳上亢",
    description: "肝阴不足，肝阳偏亢。眩晕耳鸣，头目胀痛，面红目赤，急躁易怒。",
    symptoms: ["眩晕耳鸣", "头目胀痛", "面红目赤", "急躁易怒", "失眠多梦"],
    formulas: ["天麻钩藤饮", "镇肝熄风汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-5",
    name: "脾气虚",
    description: "脾气不足，运化失职。食少便溏，腹胀，神疲乏力。",
    symptoms: ["食少纳呆", "腹胀便溏", "肢体倦怠", "面色萎黄", "脉缓弱"],
    formulas: ["四君子汤", "补中益气汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-6",
    name: "脾阳虚",
    description: "脾阳不足，虚寒内生。腹中冷痛，喜温喜按，下利清谷。",
    symptoms: ["腹中冷痛", "喜温喜按", "下利清谷", "四肢不温", "脉沉迟无力"],
    formulas: ["理中汤", "附子理中汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-7",
    name: "肺气虚",
    description: "肺气不足，卫外不固。咳喘无力，少气短息，自汗畏风。",
    symptoms: ["咳喘无力", "少气短息", "自汗畏风", "易感冒", "声音低怯"],
    formulas: ["玉屏风散", "补肺汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-8",
    name: "肺阴虚",
    description: "肺阴不足，虚热内生。干咳少痰，口干咽燥，午后潮热。",
    symptoms: ["干咳无痰", "口干咽燥", "声音嘶哑", "午后潮热", "舌红少苔"],
    formulas: ["百合固金汤", "沙参麦冬汤"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-9",
    name: "肾阳虚",
    description: "肾阳不足，温煦失职。腰膝酸冷，畏寒肢冷，夜尿频多。",
    symptoms: ["腰膝酸冷", "畏寒肢冷", "面色晄白", "夜尿频多", "脉沉迟无力"],
    formulas: ["金匮肾气丸", "右归丸"],
    source: "《中医诊断学》",
  },
  {
    id: "zf-10",
    name: "肾阴虚",
    description: "肾阴不足，虚火内扰。腰膝酸软，眩晕耳鸣，潮热盗汗。",
    symptoms: ["腰膝酸软", "眩晕耳鸣", "潮热盗汗", "五心烦热", "舌红少苔"],
    formulas: ["六味地黄丸", "左归丸"],
    source: "《中医诊断学》",
  },
];

// 三大辨证体系
const TABS = [
  { key: "bagang", label: "八纲辨证", desc: "阴阳·表里·寒热·虚实" },
  { key: "liujing", label: "六经辨证", desc: "太阳·阳明·少阳·太阴·少阴·厥阴" },
  { key: "zangfu", label: "脏腑辨证", desc: "肝·心·脾·肺·肾" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 品牌色
const BRAND = "#7B2FBE";

// ============================================================================
// 页面组件
// ============================================================================

export default function BianZhengPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("bagang");

  const currentSyndromes =
    activeTab === "bagang"
      ? BAGANG_SYNDROMES
      : activeTab === "liujing"
        ? SHANGHAN_SYNDROMES.map((s) => ({
            id: `lj-${s.name}`,
            name: s.name,
            description: s.description || "",
            symptoms: s.symptoms,
            formulas: s.formulas,
            source: "《伤寒论》",
          }))
        : ZANGFU_SYNDROMES;

  return (
    <div className="mx-auto max-w-[375px] min-h-screen" style={{ backgroundColor: "#0f1419" }}>
      <BrandHeader title="辨证学习" showBack={true} backUrl="/zhongyi" />

      {/* 页面标题 */}
      <div className="px-4 pt-4 mb-3">
        <h1 className="text-lg font-bold" style={{ color: "#e8edf0" }}>
          辨证学
        </h1>
        <p className="text-xs mt-1" style={{ color: "#8b9a8b" }}>
          中医辨证论治体系学习，典籍记载，仅供学习参考
        </p>
      </div>

      {/* 免责提示 */}
      <div className="px-4 mb-4">
        <div
          className="rounded-xl p-3"
          style={{
            backgroundColor: "rgba(212, 168, 75, 0.08)",
            border: "1px solid rgba(212, 168, 75, 0.2)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="h-4 w-4 mt-0.5 shrink-0"
              style={{ color: "#d4a84b" }}
            />
            <p className="text-xs leading-relaxed" style={{ color: "#c8b060" }}>
              本页面内容均来源于中医经典典籍记载，仅供学习研究参考，不构成任何医疗诊断或用药建议。身体不适请及时就医。
            </p>
          </div>
        </div>
      </div>

      {/* Tab 切换栏 */}
      <div className="px-4 mb-4">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ backgroundColor: "#1a2027", border: "1px solid rgba(123, 47, 190, 0.15)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: activeTab === tab.key ? BRAND : "transparent",
                color: activeTab === tab.key ? "#fff" : "#8b9a8b",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "#6b7a6b" }}>
          {TABS.find((t) => t.key === activeTab)?.desc}
        </p>
      </div>

      {/* 证型卡片列表 */}
      <div className="px-4 pb-4 space-y-3">
        {currentSyndromes.map((syndrome, idx) => (
          <SyndromeCard key={syndrome.id || idx} syndrome={syndrome} index={idx} />
        ))}
      </div>

      {/* 底部免责声明 */}
      <div className="px-4 pb-8">
        <p className="text-center text-xs" style={{ color: "#6b7a6b" }}>
          免责声明：本页面内容仅供中医学习参考，不构成医疗建议。
          所有证型、方剂、症状描述均来源于《伤寒论》《景岳全书》《中医诊断学》等典籍记载，非诊断工具。
          如有健康问题请及时前往正规医疗机构就诊。
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// 证型卡片子组件
// ============================================================================

function SyndromeCard({
  syndrome,
  index,
}: {
  syndrome: SyndromeCard;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#1a2027",
        border: "1px solid rgba(123, 47, 190, 0.12)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors"
        style={{ backgroundColor: expanded ? "rgba(123, 47, 190, 0.05)" : "transparent" }}
      >
        {/* 序号 */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
          style={{ backgroundColor: "rgba(123, 47, 190, 0.15)" }}
        >
          <span className="text-sm font-bold" style={{ color: BRAND }}>
            {index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "#e8edf0" }}>
            {syndrome.name}
          </p>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#8b9a8b" }}>
            {syndrome.description}
          </p>
        </div>

        {/* 展开/收起箭头 */}
        <svg
          className="h-4 w-4 shrink-0 transition-transform"
          style={{
            color: "#8b9a8b",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* 展开详情 */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "1px solid rgba(123, 47, 190, 0.08)" }}
        >
          {/* 证型描述 */}
          <div className="pt-3">
            <p className="text-xs font-medium mb-1" style={{ color: "#6b7a6b" }}>
              证型描述
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#c8d0c8" }}>
              {syndrome.description}
            </p>
          </div>

          {/* 主要症状 */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#6b7a6b" }}>
              主要症状
            </p>
            <div className="flex flex-wrap gap-1.5">
              {syndrome.symptoms.map((s, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full px-2.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: "rgba(123, 47, 190, 0.1)",
                    color: BRAND,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* 对应方剂 */}
          {syndrome.formulas.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#6b7a6b" }}>
                <BookOpen className="h-3 w-3 inline mr-1" style={{ color: "#d4a84b" }} />
                对应方剂（典籍记载）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {syndrome.formulas.map((f, i) => (
                  <Link
                    key={i}
                    href={`/zhongyi/formula?name=${encodeURIComponent(f)}`}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs transition-colors"
                    style={{
                      backgroundColor: "rgba(212, 168, 75, 0.1)",
                      color: "#d4a84b",
                      border: "1px solid rgba(212, 168, 75, 0.2)",
                    }}
                  >
                    {f}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 典籍出处 */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#6b7a6b" }}>
              <ScrollText className="h-3 w-3 inline mr-1" style={{ color: BRAND }} />
              典籍出处
            </p>
            <p className="text-xs" style={{ color: "#8b9a8b" }}>
              {syndrome.source}
            </p>
          </div>

          {/* 免责声明 */}
          <p className="text-xs italic" style={{ color: "#6b7a6b" }}>
            典籍记载，仅供学习参考
          </p>
        </div>
      )}
    </div>
  );
}