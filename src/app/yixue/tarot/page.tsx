"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TAROT_SPREADS,
  TAROT_DATA_VERSION,
  drawSpread,
  getCard,
  getSpread,
  type DrawnCard,
  type TarotCard,
} from "@/lib/tarotData";
import { getToolConfig } from "@/lib/toolConfigStore";
import { listReadings, saveReading, deleteReading, type SavedReading } from "@/lib/tarotStore";
import { useToolBack } from "@/lib/useToolBack";
import AIInterpretButton from "@/components/AIInterpretButton";
import { buildDeepReportSystemPrompt } from "@/lib/deepReportPrompt";
import { ShareButton } from "@/components/ShareButton";
import { useIOSLearningRedirect } from "@/components/IOSLearningRedirect";

const BRAND = "#7B2FBE";
const SUIT_MARK: Record<string, string> = { major: "✦", wands: "杖", cups: "杯", swords: "剑", pentacles: "币" };
const SUIT_COLOR: Record<string, string> = {
  major: "#7B2FBE", wands: "#C0392B", cups: "#2471A3", swords: "#5D6D7E", pentacles: "#1E8449",
};

export default function TarotPage() {
  useIOSLearningRedirect("tarot"); // IOS-4.3B：iOS 壳内旧排盘深链接 → 易学学习中心
  const tarotCfg = useMemo(() => getToolConfig().tarot, []);
  const pageKey = "yixue_tarot";
  const { showResult, setShowResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });

  // ---- 输入状态 ----
  const [question, setQuestion] = useState("");
  const [spreadId, setSpreadId] = useState("three-flow");
  const [shuffling, setShuffling] = useState(false);
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  // ---- 保存记录 ----
  const [saved, setSaved] = useState<SavedReading[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);

  useEffect(() => {
    setSaved(listReadings());
  }, []);

  const spread = getSpread(spreadId);
  const enabledSpreads = useMemo(
    () => TAROT_SPREADS.filter((s) => tarotCfg.enabledSpreadIds.includes(s.id)),
    [tarotCfg.enabledSpreadIds]
  );

  const allRevealed = !!drawn && revealed.length > 0 && revealed.every(Boolean);

  const handleShuffle = useCallback(() => {
    if (!spread || shuffling) return;
    setShuffling(true);
    setTimeout(() => {
      const cards = drawSpread(spread);
      setDrawn(cards);
      setRevealed(cards.map(() => false));
      setShuffling(false);
      setShowResult(true);
    }, 900);
  }, [spread, shuffling, setShowResult]);

  const revealCard = (idx: number) => {
    setRevealed((prev) => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  const handleSave = () => {
    if (!drawn || !spread) return;
    const name = saveName.trim() || `${spread.name} · ${new Date().toLocaleDateString("zh-CN")}`;
    const r = saveReading(name, question, spread.id, spread.name, drawn, tarotCfg.maxSavedReadings);
    if (!r.success) {
      setSaveMsg(r.error || "保存失败");
    } else {
      setSaveMsg("已保存（默认仅自己可见）");
      setSaveName("");
      setSaved(listReadings());
    }
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const handleDelete = (id: string) => {
    deleteReading(id);
    setSaved(listReadings());
    if (openRecordId === id) setOpenRecordId(null);
  };

  // AI 深度解读上下文
  const aiContext = useMemo(() => {
    if (!drawn || !spread) return "";
    const lines: string[] = [];
    lines.push(`所问之事：${question.trim() || "未填写（综合运势）"}`);
    lines.push(`牌阵：${spread.name}（${spread.positions.length}张）`);
    drawn.forEach((d, i) => {
      const c = getCard(d.cardId);
      if (!c) return;
      lines.push(`${i + 1}. ${spread.positions[i].name}：${c.suitName}·${c.name}（${d.reversed ? "逆位" : "正位"}）`);
    });
    return lines.join("\n");
  }, [drawn, spread, question]);

  const aiCardsDetail = useMemo(() => {
    if (!drawn || !spread) return "";
    return drawn
      .map((d, i) => {
        const c = getCard(d.cardId);
        if (!c) return "";
        const kw = (d.reversed ? c.reversedKeywords : c.uprightKeywords).join("、");
        const meaning = d.reversed ? c.reversed : c.upright;
        return `${spread.positions[i].name}：${c.name}（${d.reversed ? "逆位" : "正位"}）关键词：${kw}。牌义：${meaning}`;
      })
      .join("\n");
  }, [drawn, spread]);

  // ==========================================================================
  // 牌面渲染
  // ==========================================================================
  function CardTile({
    card, reversed, positionName, faceUp, onClick,
  }: { card?: TarotCard; reversed: boolean; positionName: string; faceUp: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="relative flex flex-col overflow-hidden rounded-lg border transition-all duration-300"
        style={{
          width: "100%",
          aspectRatio: "5/8",
          borderColor: faceUp ? "#e2d6f0" : "#5e2a8e",
          background: faceUp
            ? "linear-gradient(180deg, #ffffff 0%, #f8f4fd 100%)"
            : "linear-gradient(135deg, #7B2FBE 0%, #4a1d75 55%, #2e1149 100%)",
          boxShadow: "0 2px 8px rgba(123,47,190,0.18)",
          transform: faceUp ? "rotateY(0deg)" : "rotateY(0deg)",
        }}
      >
        {faceUp && card ? (
          <div className="flex h-full flex-col items-center justify-between p-1.5">
            <div className="flex w-full items-center justify-between" style={{ fontSize: "9px", color: "#999" }}>
              <span>{card.suitName}</span>
              <span>{reversed ? "逆位" : "正位"}</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                style={{ color: "#fff", backgroundColor: SUIT_COLOR[card.suit] || BRAND }}
              >
                {SUIT_MARK[card.suit]}
              </div>
              <div className="text-center font-bold leading-tight" style={{ fontSize: "12px", color: "#3a2b4d" }}>
                {card.name}
              </div>
              {reversed && (
                <div className="text-[9px] font-medium" style={{ color: "#b03a2e" }}>逆位 ▼</div>
              )}
            </div>
            <div
              className="w-full truncate rounded px-1 py-0.5 text-center text-[9px] font-medium"
              style={{ color: "#fff", backgroundColor: "rgba(123,47,190,0.82)" }}
            >
              {positionName}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <div style={{ fontSize: "20px", color: "#d9c2f2" }}>✦</div>
            <div style={{ fontSize: "10px", color: "#c9aee8", letterSpacing: "2px" }}>塔罗</div>
            <div className="absolute bottom-1.5 left-0 right-0 text-center" style={{ fontSize: "9px", color: "#a98ccf" }}>
              点击翻牌
            </div>
          </div>
        )}
      </button>
    );
  }

  function ReadingList({ cards, spreadName, positions }: { cards: DrawnCard[]; spreadName: string; positions: Array<{ name: string; desc: string }> }) {
    return (
      <div className="flex flex-col gap-2">
        {cards.map((d, i) => {
          const c = getCard(d.cardId);
          if (!c) return null;
          const kw = (d.reversed ? c.reversedKeywords : c.uprightKeywords).join("、");
          const meaning = d.reversed ? c.reversed : c.upright;
          return (
            <div key={i} className="rounded-lg border border-gray-100 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: BRAND }}>
                  {positions[i]?.name || `位置${i + 1}`}
                </span>
                <span className="text-[10px] text-gray-400">{c.suitName} · {positions[i]?.desc || ""}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">{c.name}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color: d.reversed ? "#b03a2e" : "#1E8449",
                    backgroundColor: d.reversed ? "#fdecea" : "#e9f7ef",
                  }}
                >
                  {d.reversed ? "逆位" : "正位"}
                </span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "#7B2FBE" }}>关键词：{kw}</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{meaning}</p>
            </div>
          );
        })}
        <div className="text-center text-[10px] text-gray-400">牌阵：{spreadName} · 数据版本 {TAROT_DATA_VERSION}</div>
      </div>
    );
  }

  // ==========================================================================
  // 渲染
  // ==========================================================================
  if (!tarotCfg.enabled) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">该功能暂未开放</div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f2f8]">
      {!showResult ? (
        // ==================== 输入模式 ====================
        <div className="flex flex-col gap-3 p-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="mb-1.5 text-xs font-bold text-gray-700">心中所问（可不填）</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 50))}
              placeholder="静心默念所问之事，如：近期事业发展如何？"
              className="w-full resize-none rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#7B2FBE]"
              rows={2}
            />
            <div className="mt-1 text-right text-[10px] text-gray-400">{question.length}/50</div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">选择牌阵（免费）</div>
            <div className="flex flex-col gap-2">
              {enabledSpreads.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpreadId(s.id)}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-left transition-colors"
                  style={{
                    borderColor: spreadId === s.id ? BRAND : "#e5e5e5",
                    backgroundColor: spreadId === s.id ? "#f6eefc" : "#fff",
                  }}
                >
                  <div>
                    <div className="text-sm font-bold" style={{ color: spreadId === s.id ? BRAND : "#3a2b4d" }}>
                      {s.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{s.desc}</div>
                  </div>
                  <div
                    className="ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-bold"
                    style={{ color: "#fff", backgroundColor: spreadId === s.id ? BRAND : "#b9a8c9" }}
                  >
                    {s.positions.length}张
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleShuffle}
            disabled={shuffling}
            className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #5e2a8e)` }}
          >
            {shuffling ? "洗牌中…" : "洗牌 · 开始"}
          </button>
          {shuffling && (
            <div className="flex justify-center gap-1.5 py-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="inline-block animate-bounce text-lg"
                  style={{ color: BRAND, animationDelay: `${i * 0.12}s` }}
                >
                  ✦
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        // ==================== 结果模式 ====================
        <div className="flex flex-col gap-3 p-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="text-xs font-bold" style={{ color: BRAND }}>{spread?.name}</div>
            {question.trim() && <div className="mt-1 text-xs text-gray-600">所问：{question.trim()}</div>}
            <div className="mt-1 text-[11px] text-gray-400">
              {allRevealed ? "点击下方「重新抽牌」可再次占问" : "依次点击牌背翻开各位置"}
            </div>
          </div>

          {/* 牌位区 */}
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns:
                spread?.id === "one" ? "140px" : spread?.id === "three-flow" ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
              justifyItems: "center",
            }}
          >
            {drawn?.map((d, i) => (
              <CardTile
                key={i}
                card={getCard(d.cardId)}
                reversed={d.reversed}
                positionName={spread?.positions[i]?.name || `${i + 1}`}
                faceUp={revealed[i]}
                onClick={() => revealCard(i)}
              />
            ))}
          </div>

          {/* 逐位解读 */}
          {allRevealed && spread && (
            <>
              <ReadingList cards={drawn} spreadName={spread.name} positions={spread.positions} />

              <ShareButton
                type="tool"
                title="塔罗牌阵占卜结果"
                description="塔罗牌阵解读"
                variant="block"
                label="分享占卜结果"
                shareData={{
                  toolType: "tarot",
                  title: `塔罗牌阵：${spread.name} · ${drawn.map((d) => getCard(d.cardId)?.name).filter(Boolean).join("·")}`,
                  summary: `${question.trim() || "综合运势"} · ${spread.positions.length}张牌阵`,
                  payload: {
                    summaryLines: aiContext.split("\n").filter(Boolean),
                  },
                }}
              />

              {tarotCfg.aiDeepEnabled && (
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="text-xs font-bold text-gray-700">AI 深度牌阵解读</div>
                  <div className="mt-1 text-[10px] text-gray-400">
                    综合全牌阵位置的关联解读，按次付费（¥{tarotCfg.aiDeepPrice}/次）
                  </div>
                  <div className="mt-2">
                    <AIInterpretButton
                      toolName="塔罗牌阵"
                      scope="深度牌阵解读"
                      buttonText={`AI 深度牌阵解读 ¥${tarotCfg.aiDeepPrice}/次`}
                      cacheKey={`tarot_${spreadId}_${drawn.map((d) => d.cardId + (d.reversed ? "r" : "u")).join("_")}`}
                      contextData={`${aiContext}\n各牌详情：\n${aiCardsDetail}`}
                      systemPrompt={buildDeepReportSystemPrompt("塔罗牌阵", "按牌阵位置逐一呼应牌面（含正逆位），再作整体综合论断；书面化、传统典籍风格表达")}
                    />
                  </div>
                </div>
              )}

              {/* 保存记录 */}
              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="text-xs font-bold text-gray-700">保存本次占卜</div>
                <div className="mt-1 text-[10px] text-gray-400">占卜记录默认私有，仅自己可见，可随时删除</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value.slice(0, 30))}
                    placeholder={`记录名称（默认：${spread.name}+日期）`}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                  />
                  <button
                    onClick={handleSave}
                    className="shrink-0 rounded-lg px-4 text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    保存
                  </button>
                </div>
                {saveMsg && <div className="mt-1.5 text-[11px]" style={{ color: BRAND }}>{saveMsg}</div>}
              </div>

              <button
                onClick={() => { setShowResult(false); }}
                className="w-full rounded-xl border py-2.5 text-sm font-bold"
                style={{ borderColor: "#d9c2f2", color: BRAND, backgroundColor: "#fff" }}
              >
                返回 · 换一个问题
              </button>
              <button
                onClick={handleShuffle}
                className="w-full rounded-xl py-3 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #5e2a8e)` }}
              >
                重新洗牌抽牌
              </button>
            </>
          )}
        </div>
      )}

      {/* ==================== 我的记录（默认私有） ==================== */}
      <div className="mt-1 rounded-xl border border-gray-100 bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-700">我的占卜记录（私有）</div>
          <span className="text-[10px] text-gray-400">{saved.length}/{tarotCfg.maxSavedReadings}</span>
        </div>
        {saved.length === 0 ? (
          <div className="mt-2 text-center text-[11px] text-gray-400">暂无记录，完成一次占卜后可保存</div>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {saved.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-100">
                <div className="flex items-center justify-between p-2">
                  <button
                    className="flex-1 truncate text-left text-xs font-medium text-gray-700"
                    onClick={() => setOpenRecordId(openRecordId === r.id ? null : r.id)}
                  >
                    <span style={{ color: BRAND }}>{r.spreadName}</span> · {r.title}
                    {r.question && <span className="ml-1 text-[10px] text-gray-400">（{r.question}）</span>}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="ml-2 shrink-0 text-[11px]"
                    style={{ color: "#c0392b" }}
                  >
                    删除
                  </button>
                </div>
                {openRecordId === r.id && (
                  <div className="border-t border-gray-100 p-2">
                    <div className="mb-1 text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleString("zh-CN")} · 默认私有
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.cards.map((d, i) => {
                        const c = getCard(d.cardId);
                        if (!c) return null;
                        return (
                          <span
                            key={i}
                            className="rounded px-1.5 py-0.5 text-[10px]"
                            style={{ color: d.reversed ? "#b03a2e" : "#3a2b4d", backgroundColor: "#f6eefc" }}
                          >
                            {getSpread(r.spreadId)?.positions[i]?.name || i + 1}·{c.name}{d.reversed ? "逆" : "正"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 隐私与说明 */}
      <div className="px-3 pb-3 pt-1 text-center text-[10px] text-gray-400">
        牌面释义为平台独立整理；记录仅存于本机，默认私有
      </div>
    </div>
  );
}
