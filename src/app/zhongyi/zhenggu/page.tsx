"use client";

// ============================================================================
// 中华非遗正骨专区 - v25.0.72
// 单独付费板块（ONE_TIME ¥89，价格后台工具管理中心实时可调；开关可关闭）
// - 开关/价格 SSOT：GET /api/academy/zhenggu/access（源自 tool-matrix zhongyi_zhenggu）
// - 支付：SINGLE_UNLOCK + unlockTargetId='zhongyi_zhenggu'（服务端从工具矩阵裁决金额）
// - 权益：支付成功后服务端写 user_entitlements（永久），换设备不丢
// - 内容：学院库「中华非遗正骨」类目 15 部资料 / 212 知识点 / 266 题（服务端门控）
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { getLoginState, getUserToken } from "@/lib/auth";
import { useNativePayQR } from "@/components/PayQRCodeModal";
import { paySingleUnlockAndWait } from "@/lib/paymentService";
import { isSingleUnlocked, activateSingleUnlock } from "@/lib/aiService";
import { fetchMaterials, fetchKnowledge, fetchQuestions, type MaterialVo, type KnowledgeVo, type QuestionVo } from "@/lib/academyApi";

const BRAND = "#7B2FBE";
const ZHENGGU_CATEGORY = "中华非遗正骨";
const ZHENGGU_TOOL_ID = "zhongyi_zhenggu";

const TYPE_NAMES: Record<string, string> = { single: "单选", multi: "多选", judge: "判断", fill: "填空", qa: "问答", case: "案例" };
const DIFF_NAMES: Record<string, string> = { easy: "易", medium: "中", hard: "难" };

interface ZhengguAccess {
  toolId: string;
  category: string;
  status: "ON" | "OFF" | "MAINTENANCE" | string;
  payMode: string;
  price: number;
  unlocked: boolean;
}

type TabKey = "knowledge" | "questions" | "materials";

export default function ZhengguPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [access, setAccess] = useState<ZhengguAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [tab, setTab] = useState<TabKey>("knowledge");

  const [points, setPoints] = useState<KnowledgeVo[]>([]);
  const [questions, setQuestions] = useState<QuestionVo[]>([]);
  const [materials, setMaterials] = useState<MaterialVo[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [openKpId, setOpenKpId] = useState<string | null>(null);
  const [openQId, setOpenQId] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState("");
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  const { qrModal, openQR } = useNativePayQR();

  const loadAccess = useCallback(async () => {
    const s = getLoginState();
    setLoggedIn(!!s.isLoggedIn);
    if (!s.isLoggedIn) { setAccessLoading(false); return; }
    try {
      const token = getUserToken();
      const res = await fetch("/api/academy/zhenggu/access", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data && data.success && data.access) setAccess(data.access);
    } catch { /* 网络异常不阻断，access 为 null 时显示重试 */ }
    finally { setAccessLoading(false); }
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  const unlocked = !!access && (access.unlocked || isSingleUnlocked(ZHENGGU_TOOL_ID));

  // 解锁后拉取正骨内容（学院库类目接口，服务端已做付费门控）
  const loadContent = useCallback(async () => {
    if (!unlocked) return;
    setContentLoading(true);
    try {
      const [k, q, m] = await Promise.all([
        fetchKnowledge({ track: "zhongyi", category: ZHENGGU_CATEGORY }),
        fetchQuestions({ track: "zhongyi", category: ZHENGGU_CATEGORY }),
        fetchMaterials({ track: "zhongyi", category: ZHENGGU_CATEGORY }),
      ]);
      setPoints(k && k.success && k.points ? k.points : []);
      setQuestions(q && q.success && q.questions ? q.questions : []);
      setMaterials(m && m.success && m.materials ? m.materials : []);
    } catch { /* 单项失败不阻断整页 */ }
    finally { setContentLoading(false); }
  }, [unlocked]);

  useEffect(() => { void loadContent(); }, [loadContent]);

  // 知识点按章节分组
  const chapterGroups = useMemo(() => {
    const map = new Map<string, KnowledgeVo[]>();
    for (const p of points) {
      const ch = p.chapter || "未分章节";
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch)!.push(p);
    }
    return Array.from(map.entries());
  }, [points]);

  const filteredChapters = useMemo(() => {
    if (!chapterFilter) return chapterGroups;
    const kw = chapterFilter.trim();
    return chapterGroups
      .map(([ch, list]) => [ch, list.filter((p) => p.title?.includes(kw) || p.content?.includes(kw))] as [string, KnowledgeVo[]])
      .filter(([, list]) => list.length > 0);
  }, [chapterGroups, chapterFilter]);

  // 支付解锁（微信 JSAPI / Native 扫码双通道，成功后本地标记+权益服务端入库）
  const handleUnlock = useCallback(async () => {
    if (paying || !access) return;
    if (!loggedIn) return;
    setPaying(true);
    setPayMsg("");
    try {
      const r = await paySingleUnlockAndWait(ZHENGGU_TOOL_ID, access.price, "正骨专区（永久解锁）");
      const onSuccess = () => {
        activateSingleUnlock(ZHENGGU_TOOL_ID);
        void loadAccess();
      };
      if (r.ticket) { openQR(r.ticket, onSuccess); return; }
      if (r.paid) {
        onSuccess();
      } else {
        setPayMsg(r.message || "支付未完成，可稍后重试");
      }
    } catch {
      setPayMsg("支付异常，请稍后重试");
    } finally {
      setPaying(false);
    }
  }, [paying, access, loggedIn, openQR, loadAccess]);

  // ==================== 渲染 ====================

  if (accessLoading) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="正骨专区" showBack backUrl="/zhongyi" />
        <div style={{ padding: "40px 0", textAlign: "center", color: "#999", fontSize: "13px" }}>加载中…</div>
      </div>
    );
  }

  // 板块被后台关闭 / 维护
  if (access && (access.status === "OFF" || access.status === "MAINTENANCE")) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="正骨专区" showBack backUrl="/zhongyi" />
        <div style={{ padding: "24px 16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "40px" }}>{access.status === "OFF" ? "🗂" : "🛠"}</div>
            <p style={{ fontSize: "14px", color: "#666", marginTop: "12px", lineHeight: 1.7 }}>
              {access.status === "OFF" ? "正骨专区内容暂已下线，敬请期待后续更新" : "正骨专区正在升级维护中，稍后即可恢复访问"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 未登录
  if (!loggedIn) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="正骨专区" showBack backUrl="/zhongyi" />
        <div style={{ padding: "40px 16px", textAlign: "center", color: "#999", fontSize: "13px" }}>
          登录后即可查看正骨专区
        </div>
      </div>
    );
  }

  // 付费墙（未解锁）
  if (!unlocked) {
    const price = access ? access.price : 89;
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="正骨专区" showBack backUrl="/zhongyi" />
        <div style={{ padding: "16px 12px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ background: `linear-gradient(135deg, ${BRAND}, #9B5ECF)`, padding: "28px 20px", textAlign: "center", color: "#fff" }}>
              <div style={{ fontSize: "36px" }}>🦴</div>
              <div style={{ fontSize: "19px", fontWeight: "bold", marginTop: "8px" }}>中华非遗正骨专区</div>
              <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "6px" }}>疼痛类诊断与手法传承资料 · 系统学习科目</div>
            </div>
            <div style={{ padding: "18px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[
                  { n: "15", t: "部传承资料" },
                  { n: "212", t: "个知识点" },
                  { n: "266", t: "道练习题" },
                ].map((x) => (
                  <div key={x.t} style={{ backgroundColor: "#F3EDF7", borderRadius: "10px", padding: "10px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: BRAND }}>{x.n}</div>
                    <div style={{ fontSize: "11px", color: "#8a7aa0", marginTop: "2px" }}>{x.t}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "16px", fontSize: "12px", color: "#666", lineHeight: 1.9 }}>
                <div>· 正骨轴线与手法规则（内部传承资料）</div>
                <div>· 逐条知识点含出处标签，可追溯学习</div>
                <div>· 配套题库练习（单选/判断），逐题解析</div>
              </div>
              <div style={{ marginTop: "18px", padding: "12px", borderRadius: "12px", backgroundColor: "#FFF7E6", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#8a6d3b" }}>一次性解锁 · 永久有效</div>
                <div style={{ fontSize: "30px", fontWeight: "bold", color: "#C77700", marginTop: "4px" }}>
                  <span style={{ fontSize: "15px" }}>¥</span>
                  {price}
                </div>
              </div>
              <button
                onClick={handleUnlock}
                disabled={paying}
                style={{
                  marginTop: "16px", width: "100%", padding: "13px 0", borderRadius: "12px", border: "none",
                  backgroundColor: paying ? "#b9a3ce" : BRAND, color: "#fff", fontSize: "15px", fontWeight: "bold", cursor: "pointer",
                }}
              >
                {paying ? "正在发起支付…" : "立即解锁正骨专区"}
              </button>
              {payMsg && <div style={{ marginTop: "10px", fontSize: "12px", color: "#C62828", textAlign: "center" }}>{payMsg}</div>}
              <p style={{ marginTop: "12px", fontSize: "10px", color: "#aaa", textAlign: "center", lineHeight: 1.7 }}>
                支付成功后权益实时生效（服务端记账，换设备不丢失）<br />
                本内容仅供传统文化学习研究，不构成医疗建议
              </p>
            </div>
          </div>
        </div>
        {qrModal}
      </div>
    );
  }

  // 已解锁：学习内容
  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "knowledge", label: "知识点", count: points.length },
    { key: "questions", label: "题库练习", count: questions.length },
    { key: "materials", label: "资料", count: materials.length },
  ];

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="正骨专区" showBack backUrl="/zhongyi" />

      {/* 头部横幅 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ background: `linear-gradient(135deg, ${BRAND}, #9B5ECF)`, borderRadius: "14px", padding: "14px 16px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "bold" }}>🦴 中华非遗正骨专区</div>
            <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "3px" }}>{points.length}知识点 · {questions.length}题 · {materials.length}部资料</div>
          </div>
          <span style={{ fontSize: 10, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "3px 8px" }}>已解锁</span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div style={{ padding: "12px 12px 0", display: "flex", gap: "8px" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: "10px", border: "none", cursor: "pointer",
              backgroundColor: tab === t.key ? BRAND : "#fff",
              color: tab === t.key ? "#fff" : "#666",
              fontSize: "13px", fontWeight: tab === t.key ? "bold" : 500,
            }}
          >
            {t.label} {t.count > 0 && <span style={{ fontSize: 10, opacity: 0.85 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 12px 24px" }}>
        {contentLoading && <div style={{ padding: "24px 0", textAlign: "center", color: "#999", fontSize: "13px" }}>内容加载中…</div>}

        {/* 知识点 Tab：章节分组手风琴 */}
        {!contentLoading && tab === "knowledge" && (
          <>
            <input
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              placeholder="搜索知识点标题或内容…"
              style={{
                width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "10px",
                border: "1px solid #e5e5e5", fontSize: "13px", outline: "none", marginBottom: "10px",
              }}
            />
            {filteredChapters.length === 0 && (
              <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "28px 0", textAlign: "center", color: "#999", fontSize: "13px" }}>
                暂无匹配的知识点
              </div>
            )}
            {filteredChapters.map(([ch, list]) => {
              const open = openChapter === ch;
              return (
                <div key={ch} style={{ backgroundColor: "#fff", borderRadius: "12px", marginBottom: "10px", overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenChapter(open ? null : ch)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", backgroundColor: "#fff", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333", textAlign: "left" }}>{ch}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: 10, color: "#999", backgroundColor: "#F3EDF7", borderRadius: 999, padding: "2px 7px" }}>{list.length}</span>
                      <span style={{ fontSize: "11px", color: "#999" }}>{open ? "▲" : "▼"}</span>
                    </span>
                  </button>
                  {open && (
                    <div style={{ borderTop: "1px solid #f0f0f0" }}>
                      {list.map((p) => {
                        const kpOpen = openKpId === p.id;
                        return (
                          <div key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <button
                              onClick={() => setOpenKpId(kpOpen ? null : p.id)}
                              style={{ width: "100%", textAlign: "left", padding: "10px 14px", backgroundColor: "#fff", border: "none", cursor: "pointer" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#333", fontWeight: 500, flex: 1 }}>{p.title}</span>
                                {p.difficulty && (
                                  <span style={{ fontSize: 10, color: DIFF_NAMES[p.difficulty] === "易" ? "#2E7D32" : DIFF_NAMES[p.difficulty] === "难" ? "#C62828" : "#C77700" }}>
                                    {DIFF_NAMES[p.difficulty]}
                                  </span>
                                )}
                              </div>
                            </button>
                            {kpOpen && (
                              <div style={{ padding: "0 14px 12px", backgroundColor: "#fafafa" }}>
                                <p style={{ fontSize: "12px", lineHeight: 1.8, color: "#555", margin: 0, whiteSpace: "pre-wrap" }}>{p.content}</p>
                                {p.sourceText && (
                                  <p style={{ fontSize: "10px", color: "#999", marginTop: "8px" }}>出处：{p.sourceText}</p>
                                )}
                                {(p.tags || []).length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                                    {p.tags.map((tg) => (
                                      <span key={tg} style={{ fontSize: 10, color: BRAND, backgroundColor: "#F3EDF7", borderRadius: 999, padding: "2px 8px" }}>{tg}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* 题库练习 Tab：作答+核对答案 */}
        {!contentLoading && tab === "questions" && (
          <>
            {questions.length === 0 && (
              <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "28px 0", textAlign: "center", color: "#999", fontSize: "13px" }}>
                题库整理中
              </div>
            )}
            {questions.map((q) => {
              const open = openQId === q.id;
              return (
                <div key={q.id} style={{ backgroundColor: "#fff", borderRadius: "12px", marginBottom: "10px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <span style={{ fontSize: 10, color: BRAND, backgroundColor: "#F3EDF7", borderRadius: 999, padding: "2px 8px" }}>{TYPE_NAMES[q.type] || q.type}</span>
                      <span style={{ fontSize: 10, color: "#999" }}>{DIFF_NAMES[q.difficulty] || q.difficulty}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{q.stem}</p>
                    {q.options && q.options.length > 0 && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {q.options.map((opt, i) => (
                          <div key={i} style={{ fontSize: "12px", color: "#555", backgroundColor: "#fafafa", borderRadius: "8px", padding: "7px 10px" }}>
                            <span style={{ color: BRAND, fontWeight: "bold", marginRight: "6px" }}>{String.fromCharCode(65 + i)}.</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenQId(open ? null : q.id)}
                    style={{ width: "100%", padding: "9px 0", border: "none", borderTop: "1px solid #f0f0f0", backgroundColor: "#fafafa", color: BRAND, fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
                  >
                    {open ? "收起答案" : "查看答案"}
                  </button>
                  {open && (
                    <div style={{ borderTop: "1px solid #f0f0f0", backgroundColor: "#fafafa", padding: "10px 14px" }}>
                      <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                        参考答案：<span style={{ fontWeight: "bold", color: "#27ae60" }}>{q.answer || "—"}</span>
                      </p>
                      {q.analysis && (
                        <p style={{ fontSize: "11px", lineHeight: 1.8, color: "#666", marginTop: "8px", backgroundColor: "#fff", borderRadius: "8px", padding: "8px 10px", whiteSpace: "pre-wrap" }}>
                          {q.analysis}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* 资料 Tab */}
        {!contentLoading && tab === "materials" && (
          <>
            {materials.length === 0 && (
              <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "28px 0", textAlign: "center", color: "#999", fontSize: "13px" }}>
                暂无资料
              </div>
            )}
            {materials.map((m) => (
              <div key={m.id} style={{ backgroundColor: "#fff", borderRadius: "12px", marginBottom: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333", flex: 1 }}>{m.title}</span>
                  <span style={{ fontSize: 10, color: m.status === "approved" ? "#2E7D32" : "#C77700", backgroundColor: m.status === "approved" ? "#E8F5E9" : "#FFF3E0", borderRadius: 999, padding: "2px 8px" }}>
                    {m.status === "approved" ? "已审核" : m.status === "parsed" ? "已解析" : "整理中"}
                  </span>
                </div>
                {m.textPreview && (
                  <p style={{ fontSize: "11px", color: "#999", marginTop: "6px", lineHeight: 1.7, margin: "6px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {m.textPreview}
                  </p>
                )}
                <div style={{ fontSize: 10, color: "#bbb", marginTop: "8px" }}>
                  {m.category} · {m.uploaderName} · {m.createdAt?.slice(0, 10)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
      {qrModal}
    </div>
  );
}
