"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// 梦境关键词库 - 基于《周公解梦》
interface DreamEntry {
  keyword: string;
  category: string;
  interpretation: string;
  tags: string[];
}

const DREAM_DATABASE: DreamEntry[] = [
  // ===== 人物篇 =====
  { keyword: "死人", category: "人物", interpretation: "梦见死人或死亡，通常象征告别旧阶段、迎接新生活；若为已故亲人，可能是思念所致，也暗示近期有贵人相助。", tags: ["死亡", "去世", "逝者", "亡灵"] },
  { keyword: "孕妇", category: "人物", interpretation: "梦见孕妇，主吉兆，预示财运将至，计划之事可成，家庭和睦。", tags: ["怀孕", "大肚子", "有身孕"] },
  { keyword: "婴儿", category: "人物", interpretation: "梦见婴儿，象征新生与希望，预示新的机会或计划即将开始，也代表内心脆弱渴望被爱。", tags: ["小孩", "宝宝", "新生儿", "孩童"] },
  { keyword: "老人", category: "人物", interpretation: "梦见老人，预示将得到智慧指引，事业上将有前辈提携；若老人安详，则健康平安。", tags: ["老者", "长者", "老爷爷", "老奶奶"] },
  { keyword: "名人", category: "人物", interpretation: "梦见名人明星，暗示内心渴望被认可与关注，也可能预示近期社交运势上升。", tags: ["明星", "偶像", "伟人", "名人"] },
  { keyword: "前女友", category: "人物", interpretation: "梦见旧情人，多为潜意识中未完成的情感投射，不一定代表感情复合，更多是当前生活状态的映射。", tags: ["前男友", "旧爱", "前任", "初恋"] },
  { keyword: "陌生人", category: "人物", interpretation: "梦见陌生人，代表内心未知的自我部分，或预示即将遇到新的人际关系。", tags: ["不认识的人", "路人", "神秘人"] },
  { keyword: "小偷", category: "人物", interpretation: "梦见小偷，近期需注意财物安全，也可能暗示人际关系中有不真诚之人。", tags: ["盗贼", "贼", "被盗", "偷窃"] },
  { keyword: "鬼", category: "人物", interpretation: "梦见鬼怪，多为压力与焦虑的化身，不必恐惧；若被追赶，提示需要面对现实中的问题。", tags: ["鬼魂", "幽灵", "鬼怪", "灵异"] },
  { keyword: "神仙", category: "人物", interpretation: "梦见神仙佛祖，为大吉之兆，预示将逢凶化吉，贵人相助，所求如愿。", tags: ["佛", "菩萨", "神仙", "仙人", "上帝"] },

  // ===== 动物篇 =====
  { keyword: "蛇", category: "动物", interpretation: "梦见蛇，多为吉兆。蛇主财运与智慧，青蛇有贵人相助，黑蛇防口舌是非，白蛇主灵性提升。被蛇咬预示财运将至。", tags: ["蛇咬", "蟒蛇", "青蛇", "白蛇", "黑蛇"] },
  { keyword: "狗", category: "动物", interpretation: "梦见狗，象征忠诚的朋友与人际关系。狗叫提醒注意小人，狗亲近主朋友相助，狗咬需防人际关系矛盾。", tags: ["小狗", "狗咬", "狗叫", "狗追"] },
  { keyword: "猫", category: "动物", interpretation: "梦见猫，代表女性、直觉与隐秘。猫温顺主异性缘佳，猫攻击则需防小人暗算，黑猫需注意健康。", tags: ["小猫", "猫咪", "黑猫", "白猫"] },
  { keyword: "鱼", category: "动物", interpretation: "梦见鱼，大吉！鱼主财运，鲤鱼预示事业腾飞，金鱼主偏财，群鱼游水主财源广进。", tags: ["钓鱼", "抓鱼", "吃鱼", "金鱼", "鲤鱼"] },
  { keyword: "龙", category: "动物", interpretation: "梦见龙，大吉之兆！龙为祥瑞，预示事业飞黄腾达、贵人临门，孕妇梦龙将生贵子。", tags: ["飞龙", "龙在天", "金龙", "白龙"] },
  { keyword: "老虎", category: "动物", interpretation: "梦见老虎，主权力与威严。猛虎预示将遇强敌但可化险为夷，骑虎主事业高升，虎咆哮需防官非。", tags: ["虎", "猛虎", "白虎", "老虎追"] },
  { keyword: "老鼠", category: "动物", interpretation: "梦见老鼠，需防小人和破财，也可能代表生活中有琐碎烦心事需要处理。", tags: ["耗子", "鼠", "鼠咬"] },
  { keyword: "鸟", category: "动物", interpretation: "梦见飞鸟，主喜讯将至；喜鹊预示有好消息，鹦鹉暗示被议论，鸟飞走需防机会流失。", tags: ["飞鸟", "小鸟", "喜鹊", "鸟笼"] },
  { keyword: "蜘蛛", category: "动物", interpretation: "梦见蜘蛛，预示将有创造性成果，蜘蛛结网主财运（网络赚钱），被蜘蛛咬需防口舌。", tags: ["蜘蛛网", "蜘蛛爬", "大蜘蛛"] },
  { keyword: "马", category: "动物", interpretation: "梦见马，主事业顺利。骑马预示步步高升，白马主感情顺利，野马需控制脾气。", tags: ["骑马", "白马", "黑马", "奔马"] },
  { keyword: "牛", category: "动物", interpretation: "梦见牛，主勤劳致富。黄牛主财运稳定，奶牛主家庭和睦，斗牛需防冲突。", tags: ["黄牛", "水牛", "牛群"] },
  { keyword: "鸡", category: "动物", interpretation: "梦见鸡，公鸡报晓主喜讯，母鸡主家庭和睦，鸡蛋主意外之财。", tags: ["公鸡", "母鸡", "鸡蛋", "小鸡"] },

  // ===== 自然篇 =====
  { keyword: "水", category: "自然", interpretation: "梦见水，主财运与情感。清水主吉运，浊水需防是非，流水主财源不断，大水洪水需防情绪失控。", tags: ["河水", "湖水", "海水", "发水", "涨水"] },
  { keyword: "火", category: "自然", interpretation: "梦见火，主兴旺。烈火主事业红火，小火苗主新希望，救火需防口舌，火烧身主财运亨通。", tags: ["着火", "大火", "火灾", "火焰", "烧火"] },
  { keyword: "下雨", category: "自然", interpretation: "梦见下雨，主情感宣泄与洗涤。细雨主浪漫邂逅，暴雨需防情绪爆发，雨后彩虹主困难将过。", tags: ["雨", "暴雨", "淋雨", "大雨", "小雨"] },
  { keyword: "下雪", category: "自然", interpretation: "梦见下雪，主纯洁与转机。雪花飘落主烦恼消散，积雪主事情受阻，雪中行走主艰难后有成。", tags: ["雪", "大雪", "飘雪", "雪花"] },
  { keyword: "山", category: "自然", interpretation: "梦见山，主事业与靠山。登山主步步高升，山顶主目标达成，山崩需防重大变故。", tags: ["爬山", "山峰", "高山", "登山"] },
  { keyword: "太阳", category: "自然", interpretation: "梦见太阳，大吉之兆！日出主事业起步，烈日中天主权势，日落需防衰退。", tags: ["日出", "日落", "阳光", "烈日"] },
  { keyword: "月亮", category: "自然", interpretation: "梦见月亮，主母亲与感情。满月主团圆美满，残月需防分离，月食注意健康。", tags: ["明月", "满月", "弯月", "月光"] },
  { keyword: "地震", category: "自然", interpretation: "梦见地震，多为压力释放，也预示生活将有重大变化，需做好心理准备。", tags: ["地震了", "地动", "摇晃"] },
  { keyword: "掉牙", category: "自然", interpretation: "梦见掉牙，传统说法与亲人健康有关，但现代心理学解释多为焦虑、沟通受阻或成长蜕变的象征。", tags: ["牙齿掉", "牙掉了", "掉牙齿", "拔牙"] },
  { keyword: "飞翔", category: "自然", interpretation: "梦见飞翔，为好梦！象征自由与突破，预示事业高升、愿望可成，飞不起来则暗示能力受限。", tags: ["飞", "会飞", "飞起来", "飞翔"] },

  // ===== 生活篇 =====
  { keyword: "钱", category: "生活", interpretation: "梦见钱，与财运相关。捡钱主意外之财，数钱主财运亨通，丢钱需防破财，借钱主贵人相助。", tags: ["钞票", "人民币", "金钱", "捡钱", "发财"] },
  { keyword: "房子", category: "生活", interpretation: "梦见房子，代表自我与家庭。新房子主新开始，老房子主怀旧，房子倒塌需注意家庭变故，买房主事业稳固。", tags: ["房屋", "搬家", "买房", "房屋倒塌", "新房"] },
  { keyword: "车", category: "生活", interpretation: "梦见开车，主事业进展。开车顺利主事业坦途，刹车失灵需注意失控风险，买车主新机遇，车祸需防意外。", tags: ["开车", "汽车", "买车", "车祸", "坐车"] },
  { keyword: "吃饭", category: "生活", interpretation: "梦见吃饭，主物质与精神满足。美食主享受生活，与家人吃饭主家庭和睦，吃不下饭则有烦心事。", tags: ["吃东西", "美食", "聚餐", "宴席"] },
  { keyword: "厕所", category: "生活", interpretation: "梦见厕所，与排泄负面情绪有关。如厕主释放压力，厕所脏主情绪积压，找不到厕所有隐忧难抒。", tags: ["大便", "小便", "拉屎", "撒尿", "马桶"] },
  { keyword: "考试", category: "生活", interpretation: "梦见考试，多为压力与自我评估的投射。考试顺利主信心充足，不会做题则暗示现实中有焦虑之事。", tags: ["高考", "答题", "考试不及格", "考场"] },
  { keyword: "结婚", category: "生活", interpretation: "梦见结婚，不一定预示婚讯，更多象征新的开始、责任感或人生新阶段的到来。", tags: ["婚礼", "婚宴", "婚纱", "嫁人", "娶妻"] },
  { keyword: "离婚", category: "生活", interpretation: "梦见离婚，不一定预示婚姻问题，多象征与过去告别、某种关系或状态的结束。", tags: ["分手", "离异", "婚姻破裂"] },
  { keyword: "吵架", category: "生活", interpretation: "梦见吵架，主情绪积压需要释放，也可能预示人际关系将得到改善（反梦）。", tags: ["争吵", "打架", "骂架", "争执"] },
  { keyword: "哭泣", category: "生活", interpretation: "梦见哭泣，反而是好梦！梦中哭泣主现实中欢乐将至，压力得到释放，情绪得以疏导。", tags: ["哭", "流泪", "大哭", "痛哭"] },
  { keyword: "迷路", category: "生活", interpretation: "梦见迷路，暗示现实中方向感缺失，需要重新审视目标与选择，也代表内心迷茫。", tags: ["找不到路", "迷路了", "走失"] },
  { keyword: "迟到", category: "生活", interpretation: "梦见迟到，暗示对机会的焦虑，或现实中有不想面对的事，提醒把握时机。", tags: ["赶不上", "晚点", "误点"] },

  // ===== 身体篇 =====
  { keyword: "怀孕", category: "身体", interpretation: '梦见自己怀孕（女性），多为潜意识中对生育或新计划的期待；男性梦怀孕，主事业或创意将有"产出"。', tags: ["有孕", "怀孩子", "大肚子"] },
  { keyword: "流血", category: "身体", interpretation: "梦见流血，传统认为主财运（血为财），但也提示需注意健康，大量出血需防破财。", tags: ["出血", "血", "见血", "受伤出血"] },
  { keyword: "头发", category: "身体", interpretation: "梦见头发，掉发主烦恼或精力衰退，白发主智慧增长，长女主魅力提升，剪发主告别过去。", tags: ["掉头发", "白发", "剪头发", "长发"] },
  { keyword: "裸体", category: "身体", interpretation: "梦见裸体，反映内心脆弱或渴望被理解，也可能暗示害怕被暴露真实自我。", tags: ["赤身", "光身", "没穿衣服"] },
  { keyword: "牙齿", category: "身体", interpretation: '梦见牙齿问题，掉牙最为常见，见"掉牙"条目；牙齿松动主不稳定，刷牙主形象维护。', tags: ["牙疼", "掉牙", "刷牙"] },

  // ===== 行为/事件 =====
  { keyword: "被追赶", category: "事件", interpretation: "梦见被追赶，是最常见的梦境之一，代表现实中有逃避的问题或压力，建议正视而非回避。", tags: ["被追", "逃跑", "追赶", "追杀"] },
  { keyword: "坠落", category: "事件", interpretation: "梦见从高处坠落，多为失控感的表现，提示现实中某些方面感到无力支撑，也可能是睡眠中身体反应。", tags: ["掉下来", "摔下来", "坠落", "跌落"] },
  { keyword: "溺水", category: "事件", interpretation: "梦见溺水，主情感淹没，可能现实中感情或压力让你喘不过气，需要寻求帮助。", tags: ["淹死", "落水", "沉下去"] },
  { keyword: "捡钱", category: "事件", interpretation: "梦见捡钱，主偏财运，但也提醒不要因小失大；捡钱又丢失需防到手的机会溜走。", tags: ["捡到钱", "捡钞票"] },
  { keyword: "中奖", category: "事件", interpretation: "梦见中彩票中奖，主近期有意外惊喜，但不宜沉迷投机，踏实做事才是正道。", tags: ["彩票中奖", "中大奖", "抽奖"] },
  { keyword: "上学", category: "事件", interpretation: "梦见回到学校上课，多为对过去的怀念，也暗示需要学习新技能来应对当前挑战。", tags: ["读书", "上课", "教室", "同学", "老师"] },
  { keyword: "棺材", category: "事件", interpretation: '梦见棺材，反而是吉兆！棺材谐音"官财"，主升官发财，是事业财运双收的好兆头。', tags: ["棺木", "出殡", "灵柩"] },
  { keyword: "屎", category: "事件", interpretation: "梦见屎尿，传统解梦主财运！身上沾屎主财运亨通，踩屎主偏财运，满地屎尿主财源滚滚。", tags: ["大便", "粪便", "拉屎", "踩屎"] },
  { keyword: "蛇咬", category: "事件", interpretation: "梦见被蛇咬，是吉兆！预示财运将至，也可能暗示某个机会正在靠近。", tags: ["蛇咬自己", "被蛇咬"] },
  { keyword: "前男友", category: "事件", interpretation: "梦见前任，多为潜意识对过往关系的处理，不代表想复合，更多反映当前情感状态。", tags: ["前女友", "旧情人", "前任"] },
  { keyword: "手机", category: "事件", interpretation: "梦见手机，主沟通与人际关系。手机丢失主沟通中断，手机损坏需防误会，买新手机主新社交。", tags: ["电话", "手机丢了", "手机坏了"] },
];

// 搜索关键词映射（同义词扩展）
const KEYWORD_ALIASES: Record<string, string[]> = {
  "蛇": ["小蛇", "花蛇", "被蛇追", "蛇缠身"],
  "掉牙": ["牙齿脱落", "牙齿掉了", "牙松了"],
  "水": ["发大水", "洪水", "被水淹"],
  "火": ["失火", "着火了", "被火烧"],
  "钱": ["人民币", "钞票", "现金", "元宝"],
  "死人": ["死人了", "有人死", "尸体"],
  "鬼": ["恶鬼", "厉鬼", "见鬼", "鬼压床"],
  "飞": ["飞天", "在天上飞", "飞上天"],
  "鱼": ["好多鱼", "捞鱼", "鱼跳龙门"],
  "考试": ["考试不会", "考试迟到", "交白卷"],
};

// 所有分类
const CATEGORIES = ["全部", "人物", "动物", "自然", "生活", "身体", "事件"];

// 热门搜索
const HOT_KEYWORDS = ["蛇", "鱼", "掉牙", "钱", "死人", "怀孕", "结婚", "被追赶", "水", "火", "鬼", "棺材"];

// ============================================================================
// 搜索算法
// ============================================================================

interface MatchResult {
  entry: DreamEntry;
  score: number;
  matchedKeyword: string;
}

function searchDreams(query: string): MatchResult[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results: MatchResult[] = [];
  const seen = new Set<string>();

  for (const entry of DREAM_DATABASE) {
    let score = 0;
    let matched = "";
    // 精确匹配关键词
    if (entry.keyword === q || entry.keyword.includes(q) || q.includes(entry.keyword)) {
      score += 100;
      matched = entry.keyword;
    }
    // 匹配标签
    for (const tag of entry.tags) {
      if (tag === q || tag.includes(q) || q.includes(tag)) {
        score += 80;
        if (!matched) matched = tag;
        break;
      }
    }
    // 匹配别名
    const aliases = KEYWORD_ALIASES[entry.keyword] || [];
    for (const alias of aliases) {
      if (alias.includes(q) || q.includes(alias)) {
        score += 70;
        if (!matched) matched = alias;
        break;
      }
    }
    // 匹配释文内容
    if (entry.interpretation.includes(q)) {
      score += 30;
      if (!matched) matched = q;
    }

    if (score > 0 && !seen.has(entry.keyword)) {
      results.push({ entry, score, matchedKeyword: matched });
      seen.add(entry.keyword);
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10);
}

// ============================================================================
// 主组件
// ============================================================================
export default function JiemengPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [recordSaved, setRecordSaved] = useState(false);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("jiemeng");
    if (prefill) { try { if(prefill.results){setResults(prefill.results);setHasResult(true);} if(prefill.query) setQuery(prefill.query); clearPrefillData("jiemeng"); } catch(e){} }
  }, []);

  // 自动保存记录
  useEffect(() => {
    if (hasResult && results.length > 0 && selectedClient && !recordSaved) {
      try {
        saveRecord({ clientId: selectedClient.id, type: "jiemeng", data: { query, results }, note: "", status: "pending" });
        setRecordSaved(true);
      } catch(e) { console.error("保存记录失败:", e); }
    }
  }, [hasResult, results, selectedClient, recordSaved, query]);

  // 分类浏览
  const categoryEntries = useMemo(() => {
    if (activeCategory === "全部") return DREAM_DATABASE;
    return DREAM_DATABASE.filter(e => e.category === activeCategory);
  }, [activeCategory]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setLoading(true);
    setActiveCategory("全部");
    setRecordSaved(false);
    setTimeout(() => {
      const r = searchDreams(query);
      setResults(r);
      setHasResult(true);
      setLoading(false);
    }, 200);
  }, [query]);

  const handleKeywordClick = useCallback((kw: string) => {
    setQuery(kw);
    setLoading(true);
    setRecordSaved(false);
    setTimeout(() => {
      const r = searchDreams(kw);
      setResults(r);
      setHasResult(true);
      setLoading(false);
    }, 100);
  }, []);

  const handleEntryClick = useCallback((entry: DreamEntry) => {
    setQuery(entry.keyword);
    setResults([{ entry, score: 100, matchedKeyword: entry.keyword }]);
    setHasResult(true);
    setRecordSaved(false);
  }, []);

  useEffect(() => {
    const editHandler = () => {
      setHasResult(false);
      setQuery("");
    };
    const backHandler = () => { if (hasResult) { setHasResult(false); window.__yixueBackHandled = true; } };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [hasResult]);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          {/* 客户选择 */}
          <div className="mb-2">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">梦境关键词</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="输入梦见的事物，如：蛇、鱼、掉牙"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#7B2FBE]"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: query.trim() && !loading ? BRAND : "#ccc" }}
              >
                解梦
              </button>
            </div>
          </div>

          {/* 热门关键词 */}
          <div className="mb-3">
            <div className="mb-1.5 text-xs text-gray-500">热门搜索</div>
            <div className="flex flex-wrap gap-1.5">
              {HOT_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleKeywordClick(kw)}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 active:bg-purple-50 active:border-[#7B2FBE] active:text-[#7B2FBE]"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* 分类浏览 */}
          <div className="mb-3">
            <div className="mb-1.5 text-xs text-gray-500">分类浏览</div>
            <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs transition-all ${
                    activeCategory === cat
                      ? "text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                  style={activeCategory === cat ? { backgroundColor: BRAND } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="max-h-[280px] space-y-1 overflow-y-auto">
              {categoryEntries.map((entry) => (
                <button
                  key={entry.keyword}
                  onClick={() => handleEntryClick(entry)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-left active:bg-purple-50"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{entry.keyword}</span>
                    <span className="ml-1.5 rounded bg-purple-100 px-1 py-0.5 text-[9px]" style={{ color: BRAND }}>{entry.category}</span>
                  </div>
                  <span className="text-xs text-gray-400">›</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center py-6 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <p className="mt-2 text-sm">输入关键词或选择分类查询梦境解析</p>
            <p className="mt-1 text-xs text-gray-300">周公解梦 · 梦境解析</p>
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {hasResult && (
        <div className="bg-white px-2 py-2">
          <div className="mb-3 flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: "#f3edf7" }}>
            <div>
              <div className="text-sm font-bold" style={{ color: BRAND }}>
                "{query}" 的解梦结果
              </div>
              <div className="text-xs text-gray-500">共找到 {results.length} 条相关解析</div>
            </div>
            <button
              onClick={() => { setHasResult(false); setQuery(""); }}
              className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-sm"
            >
              返回
            </button>
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">未找到与"{query}"相关的梦境解析</p>
              <p className="mt-1 text-xs text-gray-300">请尝试其他关键词或浏览分类</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {HOT_KEYWORDS.slice(0, 6).map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleKeywordClick(kw)}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r, idx) => (
                <div key={r.entry.keyword} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                      {idx + 1}
                    </span>
                    <span className="text-base font-bold text-gray-800">{r.entry.keyword}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "#f3edf7", color: BRAND }}>{r.entry.category}</span>
                    {idx === 0 && (
                      <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-600">最佳匹配</span>
                    )}
                  </div>

                  <div className="mt-2 rounded bg-purple-50/40 p-2">
                    <p className="text-xs leading-relaxed text-gray-700">{r.entry.interpretation}</p>
                  </div>

                  {r.entry.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="text-[10px] text-gray-400">相关：</span>
                      {r.entry.tags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleKeywordClick(tag)}
                          className="text-[10px] text-gray-500 underline"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2 px-1">
            <button
              onClick={() => { setHasResult(false); }}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              继续查询
            </button>
          </div>

          <EventDivinationPanel
            toolName="周公解梦"
            chartContext={`梦境关键词: ${query}\n匹配结果数: ${results.length}条\n梦境解析: ${results.map(r => r.entry.keyword + "[" + r.entry.category + "]: " + r.entry.interpretation).join(" | ")}`}
            isPaidTool={false}
          />
        </div>
      )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="周公解梦结果"
          description="周公解梦"
          variant="block"
          label="分享排盘结果"
        />
      </div>


      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容基于《周公解梦》传统民俗文化整理，仅供娱乐参考。梦境是睡眠中大脑的正常活动，与未来运势无科学关联，请理性看待。
        </p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
