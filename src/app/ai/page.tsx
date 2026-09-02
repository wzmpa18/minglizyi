"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";

// ==================== 类型定义 ====================

interface AIMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
}

// ==================== AI 回复内容库 ====================

interface AIResponseItem {
  keywords: string[];
  response: string;
}

const AI_RESPONSES: AIResponseItem[] = [
  {
    keywords: ["八字", "四柱", "排盘", "格局", "日主", "天干", "地支", "十神", "五行", "正官", "七杀"],
    response: "八字命理学，又称四柱预测学，是以人出生的年、月、日、时为四柱，每柱配以天干地支，共八个字，故称八字。通过分析八字中的五行生克、十神关系、格局高低等，可以了解一个人的性格特征、运势走向。\n\n核心概念：\n- 四柱：年柱、月柱、日柱、时柱\n- 日主：日柱的天干，代表命主本人\n- 十神：正官、七杀、正印、偏印、食神、伤官、正财、偏财、比肩、劫财\n- 五行生克：金生水、水生木、木生火、火生土、土生金\n\n建议初学者先掌握天干地支、五行生克和十神基础后再学习格局判断。",
  },
  {
    keywords: ["紫微", "斗数", "命盘", "星曜", "宫位", "天机", "紫微星", "天梁", "太阴", "太阳", "贪狼", "廉贞"],
    response: "紫微斗数是中国传统命理学的重要分支，以紫微星为首，共十四主星，分布于十二宫位。古籍以星曜的庙旺利陷、四化飞星等论述人生各领域的传统论命视角。\n\n核心概念：\n- 十四主星：紫微、天机、太阳、武曲、天同、廉贞、天府、太阴、贪狼、巨门、天相、天梁、七杀、破军\n- 十二宫位：命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、交友宫、官禄宫、田宅宫、福德宫、父母宫\n- 四化：化禄、化权、化科、化忌\n\n学习紫微斗数建议从排盘入手，先理解十二宫位的基本含义，再逐步学习星曜的特性和组合。",
  },
  {
    keywords: ["奇门", "遁甲", "天盘", "地盘", "八门", "九星", "八神", "三奇", "六仪"],
    response: "奇门遁甲是中国古代最高层次的预测学之一，融合了天文、地理、人事三才之道。其核心在于'天盘''地盘''人盘''神盘'四层结构的叠加分析。\n\n核心概念：\n- 四层结构：天盘（九星）、地盘（九宫八卦）、人盘（八门）、神盘（八神）\n- 八门：休、生、伤、杜、景、死、惊、开\n- 九星：天蓬、天芮、天冲、天辅、天禽、天心、天柱、天任、天英\n- 八神：直符、腾蛇、太阴、六合、白虎、玄武、九地、九天\n\n奇门遁甲排盘较为复杂，涉及阴遁阳遁之分、超神接气等概念，初学者建议从基础八卦九宫开始学习。",
  },
  {
    keywords: ["六爻", "摇卦", "纳甲", "六亲", "六神", "本卦", "变卦", "爻辞", "世应", "用神"],
    response: "六爻预测法源于《周易》，通过摇卦得到本卦和变卦，结合纳甲、六亲、六神等信息进行综合分析。六爻预测讲究'象数理占'的统一。\n\n核心概念：\n- 六十四卦：由八卦两两相重而成\n- 纳甲：将天干地支纳入卦中\n- 六亲：父母、兄弟、妻财、官鬼、子孙\n- 六神：青龙、朱雀、勾陈、腾蛇、白虎、玄武\n- 世应：世爻代表自己，应爻代表对方或所问之事\n\n断卦时需综合看用神旺衰、生克关系、动爻变化等，是一门需要长期实践积累的学问。",
  },
  {
    keywords: ["感冒", "发烧", "咳嗽", "风寒", "风热", "头痛", "鼻塞"],
    response: "感冒在中医中分为风寒感冒和风热感冒两大类，需要辨证论治。\n\n风寒感冒：\n- 表现：恶寒重、发热轻、无汗、头痛、鼻塞流清涕、咳嗽痰白稀\n- 治法：辛温解表\n- 常用方：麻黄汤、桂枝汤、荆防败毒散加减\n\n风热感冒：\n- 表现：发热重、恶寒轻、有汗、咽喉肿痛、鼻流黄涕、咳嗽痰黄稠\n- 治法：辛凉解表\n- 常用方：银翘散、桑菊饮加减\n\n日常调理：多喝温水、注意保暖、保证充足睡眠。如症状严重请及时就医。",
  },
  {
    keywords: ["脾胃", "消化", "腹泻", "腹胀", "便秘", "食欲", "胃痛", "胃", "脾"],
    response: "脾胃为后天之本，气血生化之源。中医认为脾胃功能的强弱直接关系到人体健康。\n\n脾胃虚弱常见表现：\n- 食欲不振、饭后腹胀\n- 大便溏薄或便秘\n- 面色萎黄、神疲乏力\n- 舌淡苔白、脉细弱\n\n调理方法：\n- 饮食有节：定时定量，少食多餐\n- 忌生冷油腻：避免损伤脾胃阳气\n- 健脾食材：山药、薏米、茯苓、莲子、芡实、白扁豆\n- 常用方剂：四君子汤、参苓白术散、补中益气汤\n\n建议日常可饮用山药薏米粥，温和调理脾胃功能。",
  },
  {
    keywords: ["中药", "药材", "草药", "四气", "五味", "归经", "配伍", "君臣佐使"],
    response: "中药学是研究中药基本理论和临床应用的科学，是中医的重要组成部分。\n\n中药性能：\n- 四气：寒、热、温、凉（平性）\n- 五味：酸、苦、甘、辛、咸（淡、涩）\n- 归经：药物对特定脏腑经络的选择性作用\n- 升降浮沉：药物作用的趋向性\n\n配伍原则（君臣佐使）：\n- 君药：针对主病或主证起主要治疗作用\n- 臣药：辅助君药或治疗兼证\n- 佐药：佐助或佐制，减轻毒性\n- 使药：调和诸药或引经报使\n\n学习中药建议从常用中药入手，循序渐进。",
  },
  {
    keywords: ["经络", "穴位", "针灸", "任脉", "督脉", "足三里", "合谷", "太冲", "内关", "涌泉"],
    response: "经络是运行气血、联络脏腑、沟通内外、贯穿上下的通路，是中医理论体系的重要组成部分。\n\n十二正经：\n- 手三阴经：手太阴肺经、手厥阴心包经、手少阴心经\n- 手三阳经：手阳明大肠经、手少阳三焦经、手太阳小肠经\n- 足三阴经：足太阴脾经、足厥阴肝经、足少阴肾经\n- 足三阳经：足阳明胃经、足少阳胆经、足太阳膀胱经\n\n常用保健穴位：\n- 足三里：健脾和胃，强壮要穴\n- 合谷：头面诸疾，'面口合谷收'\n- 内关：宁心安神，宽胸理气\n- 涌泉：补肾固本，引火归元\n\n穴位按摩需掌握正确手法和力度，建议在专业指导下学习。",
  },
  {
    keywords: ["方剂", "汤", "丸", "麻黄汤", "桂枝汤", "小柴胡", "四君子", "四物汤", "八珍汤", "六味地黄"],
    response: "方剂学是研究方剂的组成、功用、主治和配伍规律的科学。\n\n方剂分类：\n- 经方：出自《伤寒论》《金匮要略》的经典方剂\n- 时方：后世医家创制的方剂\n\n常用经典方剂：\n- 桂枝汤（解表剂）：桂枝、芍药、甘草、生姜、大枣\n- 小柴胡汤（和解剂）：柴胡、黄芩、人参、半夏、甘草、生姜、大枣\n- 四君子汤（补气剂）：人参、白术、茯苓、甘草\n- 四物汤（补血剂）：当归、川芎、白芍、熟地\n- 六味地黄丸（补阴剂）：熟地、山茱萸、山药、泽泻、丹皮、茯苓\n\n方剂学习中'方从法出，法随证立'是基本原则。",
  },
  {
    keywords: ["养生", "保健", "食疗", "作息", "调理", "身体", "健康", "疲劳", "失眠", "睡"],
    response: "中医养生讲究'治未病'，即在未病之时进行调养，预防疾病发生。\n\n养生四大原则：\n1. 顺应四时：春生、夏长、秋收、冬藏，作息饮食应顺应季节变化\n2. 调畅情志：怒伤肝、喜伤心、思伤脾、悲伤肺、恐伤肾\n3. 饮食有节：五谷为养、五果为助、五畜为益、五菜为充\n4. 起居有常：早睡早起，子时（23:00-1:00）前入睡有利于肝胆排毒\n\n日常养生建议：\n- 晨起喝一杯温水\n- 适当运动，如太极拳、八段锦、散步\n- 泡脚促进血液循环\n- 避免熬夜，保证充足睡眠\n\n养生贵在坚持，循序渐进，不可急于求成。",
  },
  {
    keywords: ["伤寒", "六经", "辨证", "太阳", "阳明", "少阳", "太阴", "少阴", "厥阴", "张仲景"],
    response: "六经辨证是张仲景《伤寒论》的核心辨证体系，将外感病的发展过程归纳为六个阶段。\n\n六经病证特点：\n- 太阳病：表证阶段，恶寒发热、头项强痛、脉浮\n- 阳明病：里热实证，身热汗出、不恶寒反恶热、口渴、脉洪大\n- 少阳病：半表半里，口苦咽干、目眩、往来寒热、胸胁苦满\n- 太阴病：脾虚寒证，腹满而吐、食不下、自利益甚\n- 少阴病：心肾虚衰，脉微细、但欲寐\n- 厥阴病：寒热错杂，消渴、气上撞心、心中疼热\n\n学习《伤寒论》建议从太阳病篇开始，打好基础后再逐步深入。",
  },
  {
    keywords: ["小六壬", "大安", "留连", "速喜", "赤口", "小吉", "空亡", "掌诀"],
    response: "小六壬是一种简便快捷的占卜方法，通过月、日、时三个数字在掌诀上推算，得出六种掌诀之一。\n\n六种掌诀：\n- 大安（吉）：事事昌，求谋在东方，失物不远去\n- 留连（凶）：事难成，求谋日未明，官事宜缓\n- 速喜（吉）：喜来临，求财向南行，失物申午见\n- 赤口（凶）：主口舌，官非切要防，失物急去寻\n- 小吉（吉）：最吉昌，凡事皆和合，失物在坤方\n- 空亡（凶）：事不长久，求谋无利益，行人有灾殃\n\n小六壬适合日常小事占卜，简单易学，是入门占卜的好选择。",
  },
  {
    keywords: ["风水", "堪舆", "宅", "朝向", "龙脉", "砂", "水", "明堂", "玄空", "飞星"],
    response: "风水学，又称堪舆学，是研究人与自然环境和谐相处的学问。核心理论包括峦头派和理气派两大体系。\n\n核心概念：\n- 峦头：研究山水形势，包括龙（山脉）、穴（选址）、砂（环绕山体）、水（水流）、向（朝向）\n- 理气：以八卦、九星、五行等理论推演方位格局\n- 玄空飞星：以时间变化推算气场流转\n- 八宅派：将住宅分为东四宅和西四宅\n\n风水讲究'藏风聚气'，好的风水格局能够让人身心舒畅。但需以科学态度看待，不可过分迷信。",
  },
];

// ==================== 快捷提问 ====================

const QUICK_QUESTIONS = [
  "帮我分析八字",
  "紫微斗数入门",
  "奇门遁甲基础",
  "六爻怎么起卦？",
  "感冒了怎么办？",
  "如何调理脾胃？",
  "中药基础知识",
  "经络穴位入门",
  "方剂学入门",
  "中医养生方法",
  "小六壬怎么用？",
  "六经辨证是什么？",
];

const DISCLAIMER_TEXT = "本内容仅供学习参考，不构成任何决策建议。如有健康问题请及时就医。";

// ==================== AI 回复匹配 ====================

function findAIResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  for (const item of AI_RESPONSES) {
    for (const keyword of item.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return item.response;
      }
    }
  }

  // 通用回复
  return "您好！我是言道AI助手，可以为您解答关于八字命理、紫微斗数、奇门遁甲、六爻占卜、梅花易数、小六壬、风水堪舆等传统易学知识，以及中医基础理论、中药学、方剂学、针灸经络、养生保健等中医知识。\n\n如果您有具体问题，欢迎详细描述，我会尽力为您解答。请注意，所有内容仅供学习参考，不构成任何决策建议。\n\n您可以从下方快捷提问中选择感兴趣的话题，或者输入您想了解的具体内容。";
}

// ==================== 子组件 ====================

function MessageBubble({ message }: { message: AIMessage }) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div className="flex flex-col max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
            message.role === "user"
              ? "rounded-br-md bg-[#7B2FBE] text-white"
              : "rounded-bl-md bg-white text-gray-700 border border-gray-200 shadow-sm"
          }`}
        >
          {message.content}
        </div>
        <span
          className={`text-[10px] text-gray-400 mt-1 ${
            message.role === "user" ? "text-right" : "text-left"
          }`}
        >
          {message.time}
        </span>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function AIPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      time: getTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // 模拟AI延迟
    setTimeout(() => {
      const aiResponse = findAIResponse(trimmed);
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: aiResponse,
        time: getTimeString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "420px", margin: "0 auto" }}>
      {/* ========== 红色 Header ========== */}
      <header
        className="sticky top-0 z-40 flex items-center px-4"
        style={{ backgroundColor: "#7B2FBE", height: "48px" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h1 className="text-lg font-bold text-white">言道AI助手</h1>
        </div>
      </header>

      {/* ========== 消息区域 ========== */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          /* 欢迎页面 */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">言道AI助手</h2>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
              我是您的学习助手，可以为您解答八字命理、紫微斗数、奇门遁甲、六爻等传统易学知识，以及中医理论、中药、方剂、经络等中医知识。
            </p>

            {/* 快捷提问 */}
            <div className="w-full">
              <p className="text-xs text-gray-400 mb-2">快捷提问：</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-all hover:border-[#7B2FBE]/30 hover:text-[#7B2FBE] hover:bg-red-50 active:scale-[0.97]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* 正在输入 */}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ========== 快捷提问（有消息时） ========== */}
      {messages.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-[10px] text-gray-400 shrink-0">快捷提问:</span>
            {QUICK_QUESTIONS.slice(0, 5).map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-gray-500 transition-colors hover:border-[#7B2FBE]/30 hover:text-[#7B2FBE]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========== 输入区 ========== */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你想了解的内容..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2FBE]/40 focus:border-transparent transition-all"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              inputValue.trim()
                ? "bg-[#7B2FBE] text-white shadow-md hover:bg-[#b82220] active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========== 底部免责声明 ========== */}
      <div className="bg-[#ededed] px-4 py-2" style={{ paddingBottom: "72px" }}>
        <p className="text-center text-xs text-gray-400">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}