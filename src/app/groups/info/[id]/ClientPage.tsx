"use client";

// ============================================================================
// v25.0.41 群详情页（群资料 + 群管理）
// 提供：群头像/群名称/成员列表(角色)/群公告/群主/管理员/群权限(全员禁言)/
//       我的群昵称/消息免打扰/邀请成员/退出·解散/举报群/转让群主/成员禁言/移除成员
// 数据源：GET /api/social/groups/:id/detail（仅成员可见）
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { ConfirmDialog } from "@/components/ui";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import {
  fetchGroupDetail,
  updateGroup,
  leaveGroup,
  dissolveGroup,
  transferGroup,
  setGroupAdmins,
  muteAllGroup,
  muteGroupMember,
  setGroupNickname,
  kickGroupMember,
  inviteGroupMembers,
  reportGroup,
  toggleConversationMute,
  type GroupVo,
  type GroupMemberVo,
} from "@/lib/socialApi";
import { getFriends } from "@/lib/socialStore";
import { getCurrentUserId } from "@/lib/auth";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

const ROLE_LABEL: Record<string, { text: string; color: string }> = {
  owner: { text: "群主", color: "#F39C12" },
  admin: { text: "管理员", color: "#3498DB" },
  member: { text: "", color: "" },
};

const MUTE_OPTIONS = [
  { label: "10分钟", minutes: 10 },
  { label: "1小时", minutes: 60 },
  { label: "12小时", minutes: 720 },
];

export default function GroupInfoClient({ routeId }: { routeId?: string }) {
  const router = useRouter();
  const groupId = routeId || "";
  const myId = getCurrentUserId();

  const [group, setGroup] = useState<GroupVo | null>(null);
  const [members, setMembers] = useState<GroupMemberVo[]>([]);
  const [myRole, setMyRole] = useState<"owner" | "admin" | "member">("member");
  const [myGroupNickname, setMyGroupNickname] = useState("");
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // 弹层状态
  const [noticeEdit, setNoticeEdit] = useState(false);
  const [noticeInput, setNoticeInput] = useState("");
  const [nameEdit, setNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nickEdit, setNickEdit] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePicked, setInvitePicked] = useState<Set<string>>(new Set());
  const [memberMenu, setMemberMenu] = useState<GroupMemberVo | null>(null);
  const [muteTarget, setMuteTarget] = useState<GroupMemberVo | null>(null);
  const [confirmKind, setConfirmKind] = useState<"leave" | "dissolve" | "transfer" | "kick" | null>(null);
  const [confirmMember, setConfirmMember] = useState<GroupMemberVo | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const anyDialog = noticeEdit || nameEdit || nickEdit || inviteOpen || !!memberMenu || !!muteTarget || !!confirmKind || reportOpen;
  useBodyScrollLock(anyDialog);
  usePopupBackHandler(() => {
    if (reportOpen) setReportOpen(false);
    else if (confirmKind) { setConfirmKind(null); setConfirmMember(null); }
    else if (muteTarget) setMuteTarget(null);
    else if (memberMenu) setMemberMenu(null);
    else if (inviteOpen) setInviteOpen(false);
    else if (nickEdit) setNickEdit(false);
    else if (noticeEdit) setNoticeEdit(false);
    else if (nameEdit) setNameEdit(false);
  }, anyDialog);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const load = useCallback(async () => {
    if (!groupId) { setError("缺少群聊参数"); setLoading(false); return; }
    try {
      const r = await fetchGroupDetail(groupId);
      if (r && r.success && r.group) {
        setGroup(r.group);
        setMembers(r.members || []);
        setMyRole(r.myRole || "member");
        setMyGroupNickname(r.myGroupNickname || "");
        setNoticeInput(r.group.announcement || "");
        setNameInput(r.group.name);
        // 会话免打扰状态从统一会话接口恢复
        try {
          const { fetchConversations } = await import("@/lib/socialApi");
          const convs = await fetchConversations();
          const c = (convs.conversations || []).find((x) => x.type === "group" && String(x.groupId) === String(groupId));
          if (c) setMuted(!!c.muted);
        } catch { /* 会话可能尚不存在 */ }
      } else {
        setError((r && r.error) || "无法获取群信息");
      }
    } catch {
      setError("网络异常，请稍后重试");
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <PageLoginGuard />
        <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto" }}>
          <BrandHeader title="群聊信息" />
          <div className="py-24 text-center text-sm text-gray-400">加载中…</div>
        </div>
      </>
    );
  }

  if (error || !group) {
    return (
      <>
        <PageLoginGuard />
        <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto" }}>
          <BrandHeader title="群聊信息" />
          <div className="py-24 text-center">
            <p className="text-sm text-gray-400">{error || "群不存在"}</p>
            <button onClick={() => router.back()} className="mt-4 rounded-xl px-6 py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
              返回
            </button>
          </div>
        </div>
      </>
    );
  }

  const isOwner = myRole === "owner";
  const isManager = myRole === "owner" || myRole === "admin";
  const convId = `group_${group.groupId}`;

  const handleUpdateGroup = async (data: { name?: string; announcement?: string }) => {
    const r = await updateGroup(groupId, data);
    if (r && r.success) {
      showToast("已保存");
      load();
    } else {
      showToast((r && r.error) || "保存失败");
    }
  };

  const handleMuteAll = async (next: boolean) => {
    const r = await muteAllGroup(groupId, next);
    if (r && r.success) {
      showToast(next ? "已开启全员禁言" : "已关闭全员禁言");
      load();
    } else {
      showToast((r && r.error) || "操作失败");
    }
  };

  const handleConversationMute = async (next: boolean) => {
    setMuted(next);
    const r = await toggleConversationMute(convId, next).catch(() => null);
    if (!r || !r.success) showToast("设置未同步到服务器");
  };

  const handleInvite = async () => {
    const ids = Array.from(invitePicked);
    if (ids.length === 0) { setInviteOpen(false); return; }
    const r = await inviteGroupMembers(groupId, ids);
    if (r && r.success) {
      showToast(`已邀请${ids.length}位好友`);
      setInviteOpen(false);
      setInvitePicked(new Set());
      load();
    } else {
      showToast((r && r.error) || "邀请失败");
    }
  };

  const handleLeave = async () => {
    const r = await leaveGroup(groupId);
    setConfirmKind(null);
    if (r && r.success) {
      showToast(r.dissolved ? "群已解散" : "已退出群聊");
      router.replace("/friends");
    } else {
      showToast((r && r.error) || "操作失败");
    }
  };

  const handleDissolve = async () => {
    const r = await dissolveGroup(groupId);
    setConfirmKind(null);
    if (r && r.success) {
      showToast("群已解散");
      router.replace("/friends");
    } else {
      showToast((r && r.error) || "解散失败");
    }
  };

  const handleTransfer = async () => {
    if (!confirmMember) return;
    const r = await transferGroup(groupId, confirmMember.userId);
    setConfirmKind(null);
    setConfirmMember(null);
    setMemberMenu(null);
    if (r && r.success) {
      showToast(`已转让给 ${confirmMember.nickname}`);
      load();
    } else {
      showToast((r && r.error) || "转让失败");
    }
  };

  const handleKick = async () => {
    if (!confirmMember) return;
    const r = await kickGroupMember(groupId, confirmMember.userId);
    setConfirmKind(null);
    setConfirmMember(null);
    setMemberMenu(null);
    if (r && r.success) {
      showToast("已移出群聊");
      load();
    } else {
      showToast((r && r.error) || "移除失败");
    }
  };

  const handleSetAdmin = async (m: GroupMemberVo, isAdmin: boolean) => {
    const r = await setGroupAdmins(groupId, m.userId, isAdmin);
    setMemberMenu(null);
    if (r && r.success) {
      showToast(isAdmin ? `已任命 ${m.nickname} 为管理员` : `已撤销 ${m.nickname} 管理员`);
      load();
    } else {
      showToast((r && r.error) || "操作失败");
    }
  };

  const handleMuteMember = async (m: GroupMemberVo, minutes: number) => {
    const r = await muteGroupMember(groupId, m.userId, minutes);
    setMuteTarget(null);
    setMemberMenu(null);
    if (r && r.success) {
      showToast(minutes > 0 ? `已禁言 ${m.nickname} ${minutes}分钟` : `已解除 ${m.nickname} 禁言`);
      load();
    } else {
      showToast((r && r.error) || "操作失败");
    }
  };

  const handleSetNickname = async () => {
    const r = await setGroupNickname(groupId, nickInput.trim());
    if (r && r.success) {
      setNickEdit(false);
      showToast("群昵称已保存");
      load();
    } else {
      showToast((r && r.error) || "保存失败");
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) { showToast("请填写举报原因"); return; }
    const r = await reportGroup(groupId, reportReason.trim());
    setReportOpen(false);
    if (r && r.success) showToast("举报已提交");
    else showToast((r && r.error) || "提交失败");
  };

  const friends = getFriends();
  const memberIds = new Set(members.map((m) => String(m.userId)));
  const invitable = friends.filter((f) => !memberIds.has(String(f.id)));

  const roleInfo = (m: GroupMemberVo) => ROLE_LABEL[m.role || "member"];

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "32px" }}>
      <PageLoginGuard />
      <BrandHeader title="群聊信息" />

      {/* ===== 群基础信息 ===== */}
      <div className="mt-2 bg-white px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white shrink-0" style={{ backgroundColor: BRAND }}>
            {(group.avatar || group.name || "群").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 truncate">{group.name}</span>
              {group.muteAll && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">全员禁言中</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">群号：{group.groupId} · {members.length}人</p>
            <p className="mt-0.5 text-xs text-gray-400">群主：{group.ownerName}</p>
          </div>
        </div>

        {isOwner && (
          <button onClick={() => setNameEdit(true)} className="mt-3 w-full rounded-xl bg-gray-50 py-2.5 text-sm text-gray-600">
            修改群名称
          </button>
        )}
      </div>

      {/* ===== 我的群昵称 / 免打扰 ===== */}
      <div className="mt-2 bg-white px-4 py-2">
        <button onClick={() => { setNickInput(myGroupNickname); setNickEdit(true); }} className="flex w-full items-center justify-between py-3">
          <span className="text-sm text-gray-800">我的群昵称</span>
          <span className="text-sm text-gray-400">{myGroupNickname || "未设置"}</span>
        </button>
        <div className="flex w-full items-center justify-between border-t border-gray-50 py-3">
          <span className="text-sm text-gray-800">消息免打扰</span>
          <button
            onClick={() => handleConversationMute(!muted)}
            className="relative h-6 w-11 rounded-full transition-colors"
            style={{ backgroundColor: muted ? BRAND : "#ddd" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: muted ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      {/* ===== 群公告 ===== */}
      <div className="mt-2 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">群公告</p>
          {isManager && (
            <button onClick={() => setNoticeEdit(true)} className="text-xs" style={{ color: BRAND }}>
              编辑
            </button>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {group.announcement || "暂无群公告"}
        </p>
      </div>

      {/* ===== 群权限 ===== */}
      {isManager && (
        <div className="mt-2 bg-white px-4 py-2">
          <div className="flex w-full items-center justify-between py-3">
            <div>
              <p className="text-sm text-gray-800">全员禁言</p>
              <p className="mt-0.5 text-xs text-gray-400">开启后仅群主和管理员可发言</p>
            </div>
            <button
              onClick={() => handleMuteAll(!group.muteAll)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ backgroundColor: group.muteAll ? BRAND : "#ddd" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                style={{ left: group.muteAll ? "22px" : "2px" }}
              />
            </button>
          </div>
        </div>
      )}

      {/* ===== 群成员 ===== */}
      <div className="mt-2 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">群成员（{members.length}）</p>
          <button onClick={() => setInviteOpen(true)} className="text-xs" style={{ color: BRAND }}>
            + 邀请好友
          </button>
        </div>
        <div className="mt-2">
          {members.map((m) => {
            const r = roleInfo(m);
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 border-b border-gray-50 py-3 last:border-0"
              >
                <button
                  onClick={() => router.push(`/user?uid=${encodeURIComponent(m.userId)}`)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: m.role === "owner" ? "#F39C12" : m.role === "admin" ? "#3498DB" : "#B39DDB" }}
                >
                  {(m.avatar || m.nickname || "友").slice(0, 1)}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-800 truncate">{m.nickname}</span>
                    {r.text && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: r.color }}>
                        {r.text}
                      </span>
                    )}
                  </div>
                  {m.groupNickname && m.groupNickname !== m.nickname && (
                    <p className="mt-0.5 text-xs text-gray-400">群昵称：{m.groupNickname}</p>
                  )}
                </div>
                {isManager && String(m.userId) !== String(group.ownerId) && String(m.userId) !== String(myId) && (
                  <button
                    onClick={() => setMemberMenu(m)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400"
                  >
                    管理
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 举报 ===== */}
      <div className="mt-2 bg-white px-4 py-2">
        <button onClick={() => setReportOpen(true)} className="flex w-full items-center justify-between py-3">
          <span className="text-sm text-gray-800">举报该群</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ===== 退出/解散 ===== */}
      <div className="mt-2 bg-white px-4 py-2">
        {isOwner ? (
          <button onClick={() => setConfirmKind("dissolve")} className="w-full py-3 text-center text-sm text-red-500">
            解散该群
          </button>
        ) : (
          <button onClick={() => setConfirmKind("leave")} className="w-full py-3 text-center text-sm text-red-500">
            退出群聊
          </button>
        )}
      </div>

      {/* ===== 修改群名弹窗 ===== */}
      {nameEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">修改群名称</p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNameEdit(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button
                onClick={() => { setNameEdit(false); if (nameInput.trim() && nameInput.trim() !== group.name) void handleUpdateGroup({ name: nameInput.trim() }); }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 群公告编辑弹窗 ===== */}
      {noticeEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">编辑群公告</p>
            <textarea
              value={noticeInput}
              onChange={(e) => setNoticeInput(e.target.value)}
              placeholder="填写群公告（200字以内）"
              rows={4}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNoticeEdit(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button
                onClick={() => { setNoticeEdit(false); void handleUpdateGroup({ announcement: noticeInput.trim() }); }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 群昵称弹窗 ===== */}
      {nickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">我的群昵称</p>
            <input
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="在本群的昵称（留空使用默认昵称）"
              maxLength={20}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNickEdit(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button onClick={handleSetNickname} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 邀请好友弹窗 ===== */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[420px] rounded-t-2xl bg-white" style={{ maxHeight: "70vh" }}>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">邀请好友入群（已选{invitePicked.size}）</p>
              <button onClick={() => setInviteOpen(false)} className="text-xs text-gray-400">关闭</button>
            </div>
            <div className="overflow-y-auto px-4" style={{ maxHeight: "48vh" }}>
              {invitable.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">没有可邀请的好友（都已在群内或暂无好友）</p>
              ) : (
                invitable.map((f) => {
                  const picked = invitePicked.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        const next = new Set(invitePicked);
                        if (picked) next.delete(f.id); else next.add(f.id);
                        setInvitePicked(next);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-50 py-3 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold" style={{ color: BRAND }}>
                        {(f.avatar || f.name).slice(0, 1)}
                      </div>
                      <span className="flex-1 truncate text-sm text-gray-800">{f.note || f.name}</span>
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                        style={{ borderColor: picked ? BRAND : "#ddd", backgroundColor: picked ? BRAND : "white" }}
                      >
                        {picked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                onClick={handleInvite}
                disabled={invitePicked.size === 0}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                邀请入群
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 成员管理菜单 ===== */}
      {memberMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setMemberMenu(null)}>
          <div className="absolute bottom-0 w-full max-w-[420px] rounded-t-2xl bg-white px-4 pb-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-center text-sm font-semibold text-gray-800">管理 {memberMenu.nickname}</p>
            {isOwner && (
              <button
                onClick={() => setConfirmKind("transfer")}
                className="w-full rounded-xl bg-gray-50 py-3 text-sm text-gray-700"
              >
                转让群主给 TA
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => handleSetAdmin(memberMenu, memberMenu.role !== "admin")}
                className="mt-2 w-full rounded-xl bg-gray-50 py-3 text-sm text-gray-700"
              >
                {memberMenu.role === "admin" ? "撤销管理员" : "设为管理员"}
              </button>
            )}
            <button onClick={() => setMuteTarget(memberMenu)} className="mt-2 w-full rounded-xl bg-gray-50 py-3 text-sm text-gray-700">
              禁言设置
            </button>
            <button onClick={() => setConfirmKind("kick")} className="mt-2 w-full rounded-xl bg-red-50 py-3 text-sm text-red-500">
              移出群聊
            </button>
            <button onClick={() => setMemberMenu(null)} className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm text-gray-500">
              取消
            </button>
          </div>
        </div>
      )}

      {/* ===== 禁言时长选择 ===== */}
      {muteTarget && (
        <div className="fixed inset-0 z-50" onClick={() => setMuteTarget(null)}>
          <div className="absolute bottom-0 w-full max-w-[420px] rounded-t-2xl bg-white px-4 pb-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">禁言 {muteTarget.nickname}</p>
            {MUTE_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => handleMuteMember(muteTarget, opt.minutes)}
                className="mt-2 w-full rounded-xl bg-gray-50 py-3 text-sm text-gray-700"
              >
                {opt.label}
              </button>
            ))}
            <button onClick={() => handleMuteMember(muteTarget, 0)} className="mt-2 w-full rounded-xl bg-gray-50 py-3 text-sm text-gray-700">
              解除禁言
            </button>
            <button onClick={() => setMuteTarget(null)} className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm text-gray-500">
              取消
            </button>
          </div>
        </div>
      )}

      {/* ===== 确认弹窗 ===== */}
      {confirmKind === "leave" && (
        <ConfirmDialog
          open
          danger
          title="退出群聊"
          message={`确定退出「${group.name}」吗？`}
          confirmText="退出"
          cancelText="取消"
          onConfirm={handleLeave}
          onCancel={() => setConfirmKind(null)}
        />
      )}
      {confirmKind === "dissolve" && (
        <ConfirmDialog
          open
          danger
          title="解散群聊"
          message={`确定解散「${group.name}」吗？解散后所有成员将被移出，且不可恢复。`}
          confirmText="解散"
          cancelText="取消"
          onConfirm={handleDissolve}
          onCancel={() => setConfirmKind(null)}
        />
      )}
      {confirmKind === "transfer" && memberMenu && (
        <ConfirmDialog
          open
          danger
          title="转让群主"
          message={`确定将群主转让给「${memberMenu.nickname}」吗？转让后你将成为普通成员。`}
          confirmText="转让"
          cancelText="取消"
          onConfirm={handleTransfer}
          onCancel={() => { setConfirmKind(null); setConfirmMember(null); }}
        />
      )}
      {confirmKind === "kick" && memberMenu && (
        <ConfirmDialog
          open
          danger
          title="移出群聊"
          message={`确定将「${memberMenu.nickname}」移出群聊吗？`}
          confirmText="移出"
          cancelText="取消"
          onConfirm={handleKick}
          onCancel={() => { setConfirmKind(null); setConfirmMember(null); }}
        />
      )}

      {/* ===== 举报群弹窗 ===== */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">举报该群</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="请描述举报原因"
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button onClick={handleReport} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "#F44336" }}>
                提交举报
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
