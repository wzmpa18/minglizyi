"use client";

/**
 * 渠道合伙人工作台（DEV-V22-PARTNER-V2）
 * 六大模块：数据概览 / 我的用户(脱敏) / 我的合伙人 / 佣金明细 / 推广物料 / 权益说明
 * 数据红线：用户信息一律脱敏展示，禁止导出
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  getMyPartnerStatus, getPartnerOverview, getPartnerTrends, getPartnerUsers,
  getPartnerSubs, getPartnerSubMonthly, getPartnerRecords,
  type PartnerOverview, type PartnerTrendPoint, type PartnerUsersPage,
  type PartnerSubRow, type PartnerSubMonthly, type PartnerRecordRow,
} from "@/lib/partnerService";
import { getInviteLink } from "@/lib/inviteApi";
import { captureAndSavePoster } from "@/lib/posterCapture";

const BRAND = "#6C3EF5";

type TabKey = "overview" | "users" | "subs" | "records" | "materials" | "benefits";

export default function PartnerPortalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("LOADING");
  const [level, setLevel] = useState("NORMAL");
  const [tab, setTab] = useState<TabKey>("overview");
  const [toast, setToast] = useState("");

  // 概览
  const [overview, setOverview] = useState<PartnerOverview | null>(null);
  const [trendDays, setTrendDays] = useState(7);
  const [trends, setTrends] = useState<PartnerTrendPoint[]>([]);

  // 我的用户
  const [usersPage, setUsersPage] = useState<PartnerUsersPage | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userSort, setUserSort] = useState<"registered" | "consume">("registered");
  const [userPaid, setUserPaid] = useState<"" | "0" | "1">("");

  // 我的合伙人
  const [subs, setSubs] = useState<PartnerSubRow[] | null>(null);
  const [subDetail, setSubDetail] = useState<PartnerSubMonthly | null>(null);

  // 佣金明细
  const [recordType, setRecordType] = useState<"base" | "nurture" | "withdrawal">("base");
  const [records, setRecords] = useState<PartnerRecordRow[] | null>(null);

  // 物料
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [recruitLink, setRecruitLink] = useState("");
  const [qrInvite, setQrInvite] = useState("");
  const [qrRecruit, setQrRecruit] = useState("");
  const posterRef = useRef<HTMLDivElement>(null);
  const [posterVariant, setPosterVariant] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  useEffect(() => {
    getMyPartnerStatus().then((s) => {
      if (!s) { setStatus("ERROR"); return; }
      setStatus(s.status);
      if (s.level) setLevel(s.level);
      if (s.userId) setRecruitLink(`${window.location.origin}/profile/partner/apply?ref=${s.userId}`);
    });
  }, []);

  // 概览加载
  useEffect(() => {
    if (status !== "APPROVED" || tab !== "overview") return;
    if (!overview) getPartnerOverview().then(setOverview);
    getPartnerTrends(trendDays).then((t) => t && setTrends(t));
  }, [status, tab, trendDays, overview]);

  // 用户列表加载
  useEffect(() => {
    if (status !== "APPROVED" || tab !== "users") return;
    getPartnerUsers(userPage, 20, userSort, userPaid || undefined).then((p) => p && setUsersPage(p));
  }, [status, tab, userPage, userSort, userPaid]);

  useEffect(() => {
    if (status !== "APPROVED" || tab !== "subs") return;
    if (!subs) getPartnerSubs().then((s) => s && setSubs(s));
  }, [status, tab, subs]);

  useEffect(() => {
    if (status !== "APPROVED" || tab !== "records") return;
    setRecords(null);
    getPartnerRecords(recordType).then((r) => r && setRecords(r));
  }, [status, tab, recordType]);

  // 物料：邀请链接 + 二维码
  useEffect(() => {
    if (status !== "APPROVED" || tab !== "materials") return;
    if (inviteLink) return;
    (async () => {
      try {
        const link = await getInviteLink();
        if (link) {
          setInviteLink(link.inviteLink);
          if (link.inviteCode) setInviteCode(link.inviteCode);
          const full = link.inviteLink.startsWith("http") ? link.inviteLink : `${window.location.origin}${link.inviteLink}`;
          const QRCode = (await import("qrcode")).default;
          setQrInvite(await QRCode.toDataURL(full, { width: 480, margin: 2, color: { dark: "#2D1A3E", light: "#FFFFFF" } }));
          if (recruitLink) setQrRecruit(await QRCode.toDataURL(recruitLink, { width: 480, margin: 2, color: { dark: "#7A3E1A", light: "#FFFFFF" } }));
        }
      } catch (e) {
        console.error("物料加载失败", e);
      }
    })();
  }, [status, tab, inviteLink, recruitLink]);

  const openSubDetail = useCallback(async (subId: string) => {
    const d = await getPartnerSubMonthly(subId);
    if (d) setSubDetail(d); else showToast("加载失败");
  }, []);

  const copyText = (text: string, tip: string) => {
    try {
      navigator.clipboard?.writeText(text).then(() => showToast(tip)).catch(() => {});
    } catch {}
  };

  const savePoster = async () => {
    if (!posterRef.current) return;
    showToast("正在生成海报...");
    try {
      const r = await captureAndSavePoster(posterRef.current, `yandao-partner-poster-${Date.now()}.png`, 2);
      showToast(r.message);
    } catch {
      showToast("保存失败，请重试");
    }
  };

  // ==================== 海报变体定义 ====================
  const POSTERS = [
    { name: "经典国风", theme: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`, tagline: "排盘・习医・会同道", sub: "一站式传统文化学习平台", qr: () => qrInvite, qrTitle: "扫码加入我的渠道" },
    { name: "中医学习", theme: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)", tagline: "中医典籍全库研习", sub: "名师课程 · 同道社区 · 边学边赚", qr: () => qrInvite, qrTitle: "扫码加入我的渠道" },
    { name: "极简功能", theme: "linear-gradient(135deg, #263238 0%, #546E7A 100%)", tagline: "14款专业排盘工具", sub: "基础功能永久免费", qr: () => qrInvite, qrTitle: "扫码加入我的渠道" },
    { name: "招募合伙人", theme: "linear-gradient(135deg, #B8860B 0%, #DAA520 100%)", tagline: "招募渠道合伙人", sub: "渠道净收入50%佣金 · 培养奖励5%", qr: () => qrRecruit, qrTitle: "扫码申请成为我的下级合伙人" },
  ];

  // ==================== 通用小组件 ====================

  const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${BRAND}, #9B59B6)` : "#fff",
      color: accent ? "#fff" : "#333",
      borderRadius: 12, padding: "12px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, marginTop: 4, opacity: accent ? 0.85 : 0.6 }}>{label}</div>
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );

  const EmptyRow = ({ text }: { text: string }) => (
    <div style={{ textAlign: "center", color: "#bbb", fontSize: 12, padding: "24px 0" }}>{text}</div>
  );

  const renderTrend = () => {
    if (!trends.length) return <EmptyRow text="暂无趋势数据" />;
    const max = Math.max(1, ...trends.map((t) => Math.max(t.registered, t.paid)));
    const maxC = Math.max(1, ...trends.map((t) => t.commissionCents));
    const w = 100 / trends.length;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 80 }}>
          {trends.map((t, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 1, height: "100%" }}>
              <div title={`注册${t.registered}`} style={{ width: "38%", height: `${(t.registered / max) * 100}%`, background: BRAND, borderRadius: "3px 3px 0 0", minHeight: t.registered > 0 ? 3 : 0 }} />
              <div title={`付费${t.paid}`} style={{ width: "38%", height: `${(t.paid / max) * 100}%`, background: "#F5A623", borderRadius: "3px 3px 0 0", minHeight: t.paid > 0 ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, fontSize: 10, color: "#999" }}>
          <span><i style={{ display: "inline-block", width: 8, height: 8, background: BRAND, borderRadius: 2, marginRight: 4 }} />注册</span>
          <span><i style={{ display: "inline-block", width: 8, height: 8, background: "#F5A623", borderRadius: 2, marginRight: 4 }} />付费</span>
          <span>· 近{trendDays}日佣金合计 ¥{(trends.reduce((s, t) => s + t.commissionCents, 0) / 100).toFixed(2)}</span>
        </div>
      </div>
    );
  };

  const recStatusText = (s: string) =>
    s === "FROZEN" ? "待结算" : s === "UNFROZEN" ? "可提现" : s === "REVERSED" ? "已冲正" : s === "INVALID" ? "无效" : s;

  // ==================== 渲染 ====================

  if (status === "LOADING") {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", background: "#f5f4fa" }}>
        <BrandHeader title="渠道合伙人" showBack backUrl="/profile" />
        <div style={{ textAlign: "center", color: "#999", padding: 60 }}>加载中...</div>
      </div>
    );
  }

  if (status !== "APPROVED") {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", background: "#f5f4fa", display: "flex", flexDirection: "column" }}>
        <BrandHeader title="渠道合伙人" showBack backUrl="/profile" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 44 }}>{status === "PENDING" ? "⏳" : "🤝"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>
              {status === "PENDING" ? "申请审核中" : status === "DISABLED" ? "资格已停用" : "尚未开通合伙人资格"}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 8, lineHeight: 1.7 }}>
              {status === "PENDING"
                ? "平台将在1-3个工作日内完成审核"
                : status === "DISABLED"
                  ? "如有疑问请联系平台客服"
                  : "申请开通后可获得专属邀请码、50%渠道佣金与培养奖励"}
            </div>
            {(status === "NONE" || status === "REJECTED") && (
              <button
                onClick={() => router.push("/profile/partner/apply")}
                style={{
                  marginTop: 16, padding: "12px 36px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${BRAND}, #9B59B6)`, color: "#fff", fontWeight: 700, fontSize: 14,
                }}
              >申请成为渠道合伙人</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const cur = POSTERS[posterVariant];

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f4fa", display: "flex", flexDirection: "column" }}>
      <BrandHeader title={`合伙人工作台${level === "CORE" ? " · 核心合伙人" : ""}`} showBack backUrl="/profile" />

      {/* Tab 栏 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #f0ecf8", overflowX: "auto", flexShrink: 0 }}>
        {([
          { key: "overview", label: "概览" },
          { key: "users", label: "我的用户" },
          { key: "subs", label: "我的合伙人" },
          { key: "records", label: "佣金明细" },
          { key: "materials", label: "推广物料" },
          { key: "benefits", label: "权益说明" },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, minWidth: 64, padding: "12px 4px", border: "none", background: "none",
              fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? BRAND : "#888",
              borderBottom: tab === t.key ? `2px solid ${BRAND}` : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 40px" }}>
        {/* ========== 数据概览 ========== */}
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <StatCard label="渠道累计注册" value={overview ? String(overview.channelRegistered) : "-"} />
              <StatCard label="累计付费人数" value={overview ? String(overview.channelPaidUsers) : "-"} />
              <StatCard label="累计实付总额" value={overview ? `¥${overview.channelGrossYuan}` : "-"} />
              <StatCard label="直属下级合伙人" value={overview ? String(overview.subPartnerCount) : "-"} />
              <StatCard label="累计基础佣金" value={overview ? `¥${overview.baseCommissionYuan}` : "-"} accent />
              <StatCard label="累计培养奖励" value={overview ? `¥${overview.nurtureTotalYuan}` : "-"} accent />
              <StatCard label="已结算金额" value={overview ? `¥${overview.settledTotalYuan}` : "-"} />
              <StatCard label="待结算金额" value={overview ? `¥${overview.pendingSettleYuan}` : "-"} />
            </div>
            <SectionCard title="可提现余额">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: BRAND }}>¥{overview ? overview.withdrawableYuan : "-"}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>每月16日-月末开放提现，微信零钱到账</div>
                </div>
                <button
                  onClick={() => router.push("/profile/income")}
                  style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 700 }}
                >去提现</button>
              </div>
            </SectionCard>
            <SectionCard title="趋势图">
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[7, 30].map((d) => (
                  <button key={d} onClick={() => setTrendDays(d)}
                    style={{
                      padding: "5px 14px", borderRadius: 14, border: `1px solid ${trendDays === d ? BRAND : "#e5e0f5"}`,
                      background: trendDays === d ? BRAND : "#fff", color: trendDays === d ? "#fff" : "#666", fontSize: 12,
                    }}>近{d}日</button>
                ))}
              </div>
              {renderTrend()}
            </SectionCard>
          </>
        )}

        {/* ========== 我的用户（脱敏） ========== */}
        {tab === "users" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[{ v: "", t: "全部" }, { v: "1", t: "已付费" }, { v: "0", t: "未付费" }].map((f) => (
                <button key={f.t} onClick={() => { setUserPaid(f.v as "" | "0" | "1"); setUserPage(1); }}
                  style={{
                    padding: "5px 12px", borderRadius: 14, border: `1px solid ${userPaid === f.v ? BRAND : "#e5e0f5"}`,
                    background: userPaid === f.v ? BRAND : "#fff", color: userPaid === f.v ? "#fff" : "#666", fontSize: 12,
                  }}>{f.t}</button>
              ))}
              <button onClick={() => { setUserSort(userSort === "registered" ? "consume" : "registered"); setUserPage(1); }}
                style={{
                  padding: "5px 12px", borderRadius: 14, border: "1px solid #e5e0f5", background: "#fff", color: "#666", fontSize: 12,
                }}>{userSort === "registered" ? "按注册时间 ↓" : "按消费金额 ↓"}</button>
            </div>
            <SectionCard title={`渠道用户（${usersPage ? usersPage.total : 0}）· 信息已脱敏`}>
              {!usersPage ? <EmptyRow text="加载中..." /> : usersPage.users.length === 0 ? <EmptyRow text="暂无渠道用户" /> : (
                usersPage.users.map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < usersPage.users.length - 1 ? "1px solid #f5f2fb" : "none" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#333" }}>
                        {u.phoneMasked || u.userIdMasked}
                        <span style={{ marginLeft: 8, fontSize: 10, color: u.isPaid ? "#389e0d" : "#bbb", background: u.isPaid ? "#f6ffed" : "#fafafa", padding: "1px 6px", borderRadius: 8 }}>
                          {u.isPaid ? "已付费" : "未付费"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>ID {u.userIdMasked} · 注册 {String(u.registeredAt || "").slice(0, 10)}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: u.isPaid ? "#cf1322" : "#ccc" }}>{u.isPaid ? `¥${u.consumeYuan}` : "-"}</div>
                  </div>
                ))
              )}
              {usersPage && usersPage.total > usersPage.size && (
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}>
                  <button disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e5e0f5", background: "#fff", color: userPage <= 1 ? "#ccc" : "#666", fontSize: 12 }}>上一页</button>
                  <span style={{ fontSize: 12, color: "#999", lineHeight: "30px" }}>{userPage} / {Math.ceil(usersPage.total / usersPage.size)}</span>
                  <button disabled={userPage >= Math.ceil(usersPage.total / usersPage.size)} onClick={() => setUserPage(userPage + 1)}
                    style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e5e0f5", background: "#fff", color: userPage >= Math.ceil(usersPage.total / usersPage.size) ? "#ccc" : "#666", fontSize: 12 }}>下一页</button>
                </div>
              )}
              <div style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 10 }}>为保障用户隐私，联系方式已脱敏且不可导出</div>
            </SectionCard>
          </>
        )}

        {/* ========== 我的合伙人 ========== */}
        {tab === "subs" && (
          <SectionCard title={`直属下级合伙人（${subs ? subs.length : 0}）· 仅一级有效`}>
            {!subs ? <EmptyRow text="加载中..." /> : subs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <EmptyRow text="暂无直属下级合伙人" />
                <button onClick={() => setTab("materials")}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#FFF7E6", color: "#ad6800", fontSize: 12, fontWeight: 600 }}>
                  生成「招募合伙人」海报发展下级
                </button>
              </div>
            ) : subs.map((s) => (
              <div key={s.partnerUserId} onClick={() => openSubDetail(s.partnerUserId)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f2fb" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>
                    {s.nickname}
                    {s.level === "CORE" && <span style={{ marginLeft: 6, fontSize: 10, color: "#ad6800", background: "#FFF7E6", padding: "1px 6px", borderRadius: 8 }}>核心</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>开通 {String(s.joinedAt || "").slice(0, 10)} · 渠道用户 {s.channelUserCount}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>流水 ¥{s.channelFlowYuan}</div>
                  <div style={{ fontSize: 10, color: BRAND, marginTop: 2 }}>为我带来 ¥{s.nurtureFromYuan}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 10 }}>培养奖励 = 下级渠道每笔净收入 × 5%，平台全额承担</div>
          </SectionCard>
        )}

        {/* ========== 佣金明细 ========== */}
        {tab === "records" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[{ v: "base", t: "基础佣金" }, { v: "nurture", t: "培养奖励" }, { v: "withdrawal", t: "提现记录" }].map((f) => (
                <button key={f.t} onClick={() => setRecordType(f.v as "base" | "nurture" | "withdrawal")}
                  style={{
                    padding: "5px 14px", borderRadius: 14, border: `1px solid ${recordType === f.v ? BRAND : "#e5e0f5"}`,
                    background: recordType === f.v ? BRAND : "#fff", color: recordType === f.v ? "#fff" : "#666", fontSize: 12,
                  }}>{f.t}</button>
              ))}
            </div>
            <SectionCard title={recordType === "base" ? "基础佣金明细（渠道净收入×50%）" : recordType === "nurture" ? "培养奖励明细（下级净收入×5%）" : "提现记录"}>
              {!records ? <EmptyRow text="加载中..." /> : records.length === 0 ? <EmptyRow text="暂无记录" /> : records.map((r, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: i < records.length - 1 ? "1px solid #f5f2fb" : "none" }}>
                  {recordType === "withdrawal" ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>提现 ¥{r.amountYuan}</div>
                        <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
                          {r.withdrawNo} · {r.status === "PAID" ? `已到账 ${String(r.paidAt || "").slice(0, 10)}` : r.status === "FAILED" ? `失败:${r.failReason || "-"}` : r.status === "REJECTED" ? "已驳回" : "审核/转账中"}
                          {r.transferNo ? ` · 转账单号${r.transferNo}` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: r.status === "PAID" ? "#389e0d" : "#fa8c16", background: r.status === "PAID" ? "#f6ffed" : "#fff7e6", padding: "2px 8px", borderRadius: 8 }}>
                        {r.status === "PAID" ? "已到账" : r.status === "FAILED" ? "失败" : r.status === "REJECTED" ? "驳回" : "处理中"}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#555" }}>
                          {recordType === "base" ? `订单 ${r.orderNo} · 用户 ${r.payerMasked}` : (r.note || "").slice(0, 26)}
                        </div>
                        <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
                          净收入 ¥{r.netYuan} × {r.ratioPercent}% · {String(r.createdAt || "").slice(0, 10)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>+¥{r.amountYuan}</div>
                        <div style={{ fontSize: 10, color: recStatusText(r.status) === "可提现" ? "#389e0d" : "#999", marginTop: 2 }}>{recStatusText(r.status)}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </SectionCard>
          </>
        )}

        {/* ========== 推广物料 ========== */}
        {tab === "materials" && (
          <>
            <SectionCard title="专属邀请码 / 链接">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 10, border: `1.5px dashed ${BRAND}`, color: BRAND, fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
                  {inviteCode || "加载中..."}
                </div>
                <button onClick={() => copyText(inviteCode, "邀请码已复制")}
                  style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: BRAND, color: "#fff", fontSize: 12 }}>复制</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => copyText(inviteLink, "邀请链接已复制")} disabled={!inviteLink}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e5e0f5", background: "#fff", color: "#555", fontSize: 12 }}>复制邀请链接</button>
                <button onClick={() => copyText(recruitLink, "招募链接已复制")} disabled={!recruitLink}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #f0d996", background: "#FFF7E6", color: "#ad6800", fontSize: 12 }}>复制招募链接</button>
              </div>
            </SectionCard>

            <SectionCard title="专属推广海报（3套推广 + 1套招募）">
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {POSTERS.map((p, i) => (
                  <button key={p.name} onClick={() => setPosterVariant(i)}
                    style={{
                      padding: "6px 12px", borderRadius: 14, fontSize: 12,
                      border: `1px solid ${posterVariant === i ? BRAND : "#e5e0f5"}`,
                      background: posterVariant === i ? BRAND : "#fff", color: posterVariant === i ? "#fff" : "#666",
                    }}>{p.name}</button>
                ))}
              </div>
              {/* 海报预览（隐藏容器用于生成完整图） */}
              <div ref={posterRef} style={{ position: "absolute", left: "-9999px", top: 0, width: 375, backgroundColor: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
                <div style={{ background: cur.theme, padding: "36px 24px 26px", textAlign: "center", color: "#fff" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.4 }}>{cur.tagline}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{cur.sub}</div>
                  {posterVariant === 3 && (
                    <div style={{ fontSize: 12, opacity: 0.92, marginTop: 10, lineHeight: 1.8 }}>
                      基础佣金：渠道净收入×50%<br />培养奖励：直属下级净收入×5%<br />平台承担奖励 · 月度统一结算
                    </div>
                  )}
                </div>
                <div style={{ padding: "20px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{cur.qrTitle}</div>
                  {cur.qr() ? (
                    <img src={cur.qr()} alt="qr" style={{ width: 170, height: 170, marginTop: 12 }} />
                  ) : (
                    <div style={{ width: 170, height: 170, marginTop: 12, background: "#f5f5f5", borderRadius: 8, lineHeight: "170px", color: "#ccc", fontSize: 12 }}>二维码生成中</div>
                  )}
                  <div style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                    邀请码 <span style={{ fontWeight: 800, color: BRAND, letterSpacing: 1 }}>{inviteCode || "—"}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 8 }}>言道国学 · 传统文化一站式学习平台</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#faf9ff", borderRadius: 12, padding: 12 }}>
                <div style={{ width: 64, height: 92, borderRadius: 6, background: cur.theme, flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.9)" }}>{cur.name}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{cur.name}海报</div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 4, lineHeight: 1.6 }}>
                    {posterVariant === 3 ? "扫码自动绑定推荐关系，进入合伙人申请页" : "二维码绑定您的专属渠道ID，扫码注册永久归属"}
                  </div>
                </div>
              </div>
              <button onClick={savePoster}
                style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${BRAND}, #9B59B6)`, color: "#fff", fontSize: 14, fontWeight: 700 }}>
                保存{cur.name}海报
              </button>
            </SectionCard>
          </>
        )}

        {/* ========== 权益说明 ========== */}
        {tab === "benefits" && (
          <>
            <SectionCard title="当前等级">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: level === "CORE" ? "linear-gradient(135deg,#B8860B,#DAA520)" : `linear-gradient(135deg,${BRAND},#9B59B6)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {level === "CORE" ? "👑" : "🤝"}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#333" }}>{level === "CORE" ? "核心合伙人" : "渠道合伙人"}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>基础分成比例 {overview ? overview.ratios.commissionPercent : 50}% · 培养奖励 {overview ? overview.ratios.nurturePercent : 5}%</div>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="结算规则（唯一口径）">
              {[
                ["渠道净收入", "用户实付总额 − 支付手续费 − AI调用成本 − 该订单普通两级分销佣金(15%+5%)"],
                ["基础佣金", "渠道净收入 × 50%"],
                ["培养奖励", "直属一级下级合伙人每笔渠道净收入 × 5%（平台全额承担，不影响下级收益）"],
                ["层级限制", "培养奖励仅直属一级有效，隔代不绑定、不奖励"],
                ["结算周期", "每月1日自动生成上月结算单，审核通过转入可提现"],
                ["提现窗口", "每月16日-月末，微信商家转账至零钱，1-3个工作日到账"],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 5 ? "1px solid #f5f2fb" : "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, minWidth: 72, flexShrink: 0 }}>{t}</div>
                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>{d}</div>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="高阶权益（核心合伙人）">
              <div style={{ fontSize: 12, color: "#666", lineHeight: 2 }}>
                <div>◆ 白牌贴牌：以您的品牌呈现部分界面</div>
                <div>◆ 定制独立APK：独立安装包与升级通道</div>
                <div>◆ 专属运营支持与更高分成空间</div>
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 6 }}>升级核心合伙人请联系平台商务</div>
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* 合伙人月度明细弹层 */}
      {subDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setSubDetail(null)}>
          <div style={{ background: "#fff", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: "420px", margin: "0 auto", padding: "18px 16px 32px", maxHeight: "70vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#333", marginBottom: 4 }}>下级合伙人月度业绩</div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>ID {subDetail.partnerUserId} · 累计渠道流水 ¥{subDetail.channelFlowYuan}</div>
            {subDetail.monthly.length === 0 ? <EmptyRow text="暂无月度数据" /> : subDetail.monthly.map((m) => (
              <div key={m.period} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f2fb" }}>
                <div style={{ fontSize: 13, color: "#333" }}>{m.period}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  渠道流水 <b>¥{m.flowYuan}</b>
                  <span style={{ color: BRAND, marginLeft: 10 }}>奖励 ¥{m.nurtureYuan}</span>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 10 }}>仅可见汇总业绩，无法查看其下级用户隐私数据</div>
            <button onClick={() => setSubDetail(null)}
              style={{ width: "100%", marginTop: 14, padding: "11px 0", borderRadius: 12, border: "none", background: "#f5f2fb", color: "#666", fontSize: 13 }}>关闭</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 100,
          background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 13,
          padding: "10px 18px", borderRadius: 20, zIndex: 999,
        }}>{toast}</div>
      )}
    </div>
  );
}
