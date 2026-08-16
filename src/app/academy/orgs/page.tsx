"use client";

// ============================================================================
// P6-I 机构学习空间 SaaS - v25.0.22
// 入驻申请 / 我的机构（邀请码·成员·排行·收益）/ 机构广场 / 凭码加入
// ============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import {
  applyOrg,
  fetchOrgs,
  fetchOrgDetail,
  createOrgInviteCode,
  joinOrgByCode,
  fetchOrgMembers,
  fetchOrgRanking,
  fetchOrgEarnings,
  type OrgVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

type TabKey = "plaza" | "apply" | "mine" | "join";

export default function OrgsPage() {
  const [tab, setTab] = useState<TabKey>("plaza");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [plaza, setPlaza] = useState<OrgVo[]>([]);
  const [mine, setMine] = useState<OrgVo[]>([]);

  // 入驻表单
  const [name, setName] = useState("");
  const [type, setType] = useState<"public" | "commercial">("public");
  const [intro, setIntro] = useState("");

  // 加入表单
  const [joinCode, setJoinCode] = useState("");

  // 机构管理详情
  const [current, setCurrent] = useState<OrgVo | null>(null);
  const [members, setMembers] = useState<Array<{ userId: string; role: string; joinedAt: string; checkins: number; passes: number }>>([]);
  const [ranking, setRanking] = useState<Array<{ user_id: string; checkins: number; avgScore: number; passes: number }>>([]);
  const [earnings, setEarnings] = useState<{ total: number; list: Array<{ id: string; userId: string; source: string; amount: number; note: string; createdAt: string }> }>({ total: 0, list: [] });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetchOrgs(), fetchOrgs(true)]);
      setPlaza(p && p.success && p.orgs ? p.orgs : []);
      setMine(m && m.success && m.orgs ? m.orgs : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadLists(); }, [loadLists]);

  const loadOrgDetail = useCallback(async (id: string) => {
    setBusy(true);
    try {
      const r = await fetchOrgDetail(id);
      if (r && r.success && r.org) {
        setCurrent(r.org);
        const [mem, rank, earn] = await Promise.all([fetchOrgMembers(id), fetchOrgRanking(id), fetchOrgEarnings(id)]);
        setMembers(mem && mem.success && mem.members ? mem.members : []);
        setRanking(rank && rank.success && rank.ranking ? rank.ranking : []);
        setEarnings({ total: earn && earn.total ? earn.total : 0, list: earn && earn.success && earn.earnings ? earn.earnings : [] });
      } else {
        showToast((r && r.error) || "机构信息加载失败");
      }
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  }, []);

  const handleApply = async () => {
    const n = name.trim();
    if (!n) { showToast("请填写机构名称"); return; }
    setBusy(true);
    try {
      const r = await applyOrg({ name: n, type, intro: intro.trim() || undefined });
      if (r && r.success) {
        showToast("入驻申请已提交，等待平台审核");
        setName(""); setIntro("");
        await loadLists();
        setTab("mine");
      } else {
        showToast((r && r.error) || "提交失败");
      }
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  const handleJoin = async () => {
    const c = joinCode.trim().toUpperCase();
    if (!c) { showToast("请输入邀请码"); return; }
    setBusy(true);
    try {
      const r = await joinOrgByCode(c);
      if (r && r.success) {
        showToast("已加入机构");
        setJoinCode("");
        await loadLists();
      } else {
        showToast((r && r.error) || "加入失败");
      }
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  const handleInvite = async () => {
    if (!current) return;
    setBusy(true);
    try {
      const r = await createOrgInviteCode(current.id);
      if (r && r.success && r.code) showToast(`邀请码：${r.code}（已复制提示，请记录）`);
      else showToast((r && r.error) || "生成失败");
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="机构专区" showBack backUrl="/academy" />

      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {([["plaza", "机构广场"], ["apply", "入驻申请"], ["mine", "我的机构"], ["join", "凭码加入"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative flex-1 py-3 text-xs font-semibold"
            style={{ color: tab === k ? BRAND : "#999" }}
          >
            {label}
            {tab === k && <div className="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full" style={{ width: 32, backgroundColor: BRAND }} />}
          </button>
        ))}
      </div>

      <div className="px-3 py-3 pb-24">
        {/* 机构广场 */}
        {tab === "plaza" && (
          <div className="space-y-2.5">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-800">零成本搭建专属学习系统</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                AI 自动出题考级 · 学员精细化管理 · 自定义等级证书 · 学员付费享收益
              </p>
              <button onClick={() => setTab("apply")} className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                申请入驻 →
              </button>
            </div>
            {loading && <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>}
            {!loading && plaza.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800">{o.name}</p>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold" style={{ color: BRAND }}>
                    {o.type === "public" ? "公益" : "商业"}
                  </span>
                </div>
                {o.intro && <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{o.intro}</p>}
                <p className="mt-2 text-[10px] text-gray-400">成员 {o.memberCount ?? 0} 人 · 资料库 {o.materialCount ?? 0} 份</p>
                <button onClick={() => setTab("join")} className="mt-2 w-full rounded-lg border py-2 text-[11px] font-semibold" style={{ borderColor: "#e0d4f0", color: BRAND }}>
                  凭邀请码加入
                </button>
              </div>
            ))}
            {!loading && plaza.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-500">暂无开放机构</p>
                <p className="mt-1 text-xs text-gray-400">第一个入驻的机会就是你的</p>
              </div>
            )}
          </div>
        )}

        {/* 入驻申请 */}
        {tab === "apply" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">机构名称 *</p>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="如：某某中医公益学习班"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" style={{ outline: "none" }} />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">机构类型 *</p>
              <div className="mt-2 flex gap-2">
                {([["public", "公益非营利"], ["commercial", "商业培训"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setType(k)} className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                    style={{ backgroundColor: type === k ? BRAND : "#f5f5f5", color: type === k ? "#fff" : "#666" }}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
                {type === "public" ? "公益机构：审核通过后免费开通基础版（50 人以内成员）" : "商业机构：按人数档位付费开通，全部功能（档位价格由平台配置）"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">机构介绍</p>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={500}
                placeholder="教学方向、师资、招生对象等（将展示在机构主页）"
                className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed" style={{ outline: "none" }} />
            </div>
            <button disabled={busy} onClick={handleApply} className="w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}>
              {busy ? "提交中..." : "提交入驻申请"}
            </button>
            <p className="text-center text-[10px] text-gray-400">流程：提交信息 → 平台审核 → 开通专属空间 → 后台自主管理</p>
          </div>
        )}

        {/* 我的机构 */}
        {tab === "mine" && (
          <div className="space-y-2.5">
            {loading && <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>}
            {!loading && mine.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-500">你还未管理任何机构</p>
                <button onClick={() => setTab("apply")} className="mt-3 rounded-xl px-6 py-2 text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>申请入驻</button>
              </div>
            )}
            {!loading && mine.map((o) => (
              <button key={o.id} onClick={() => loadOrgDetail(o.id)}
                className="w-full rounded-2xl bg-white p-4 text-left shadow-sm active:bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800">{o.name}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: o.status === "active" ? "#ecfdf5" : "#fffbeb", color: o.status === "active" ? "#10b981" : "#f59e0b" }}>
                    {o.status === "active" ? "已开通" : o.status === "pending" ? "待审核" : "已驳回"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">档位 {o.tier || "-"} · 成员 {o.memberCount ?? 0}/{o.memberLimit}</p>
              </button>
            ))}

            {current && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" style={{ maxHeight: "100vh" }} onClick={() => setCurrent(null)}>
                <div className="w-full max-w-[420px] overflow-y-auto rounded-t-3xl bg-white p-4" style={{ maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800">{current.name} · 管理后台</p>
                    <button onClick={() => setCurrent(null)} className="text-xs text-gray-400">关闭</button>
                  </div>

                  <button disabled={busy} onClick={handleInvite} className="w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                    生成专属邀请码
                  </button>

                  <p className="mt-4 text-xs font-bold text-gray-700">成员管理（{members.length}）</p>
                  <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[11px]">
                        <span className="font-semibold text-gray-700">用户 {m.userId}</span>
                        <span className="text-gray-400">{m.role === "owner" ? "创建者" : m.role === "admin" ? "管理员" : "成员"} · 打卡 {m.checkins} · 通过 {m.passes}</span>
                      </div>
                    ))}
                    {members.length === 0 && <p className="py-2 text-center text-[11px] text-gray-300">暂无成员</p>}
                  </div>

                  <p className="mt-4 text-xs font-bold text-gray-700">内部排行榜</p>
                  <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                    {ranking.map((r, i) => (
                      <div key={r.user_id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[11px]">
                        <span className="font-semibold text-gray-700">#{i + 1} 用户 {r.user_id}</span>
                        <span className="text-gray-400">打卡 {r.checkins} · 均分 {Math.round(r.avgScore)} · 通过 {r.passes}</span>
                      </div>
                    ))}
                    {ranking.length === 0 && <p className="py-2 text-center text-[11px] text-gray-300">暂无数据</p>}
                  </div>

                  <p className="mt-4 text-xs font-bold text-gray-700">收益中心（累计 {earnings.total} 积分/元）</p>
                  <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                    {earnings.list.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[11px]">
                        <span className="text-gray-600">{e.source === "member_pay" ? "会员消费分佣" : e.source === "invite" ? "邀请注册奖励" : e.source}</span>
                        <span className="font-semibold text-green-600">+{e.amount}</span>
                      </div>
                    ))}
                    {earnings.list.length === 0 && <p className="py-2 text-center text-[11px] text-gray-300">暂无收益记录</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 凭码加入 */}
        {tab === "join" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">机构邀请码</p>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="如：YD3ABC123"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-base font-mono tracking-widest" style={{ outline: "none" }} />
              <button disabled={busy} onClick={handleJoin} className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white"
                style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}>
                加入机构
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-gray-400">加入后自动归属对应机构，可访问机构内部资料、题库与考试；成员数达到机构上限后将无法加入。</p>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900/85 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
