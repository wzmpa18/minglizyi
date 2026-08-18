"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  fetchGroupDetail,
  leaveGroup,
  kickGroupMember,
  updateGroup as updateGroupRemote,
  type GroupVo,
  type GroupMemberVo,
} from "@/lib/socialApi";
import { getGroups } from "@/lib/socialStore";
import { getCurrentUserId } from "@/lib/auth";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function GroupInfoPage({ routeId }: { routeId?: string }) {
  const params = useParams();
  const router = useRouter();
  const groupId = routeId || (params.id as string);

  useToolBack({ pageKey: "group_info_" + groupId });

  const [group, setGroup] = useState<GroupVo | null>(null);
  const [members, setMembers] = useState<GroupMemberVo[]>([]);
  const [online, setOnline] = useState(false); // 后端通道是否可用
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [kickTarget, setKickTarget] = useState<GroupMemberVo | null>(null);
  const [msg, setMsg] = useState("");

  // P1 弹窗规范：退群/踢人确认弹窗 —— 返回键优先关闭弹窗 + 背景滚动锁
  const anyConfirmOpen = showLeaveConfirm || !!kickTarget;
  useBodyScrollLock(anyConfirmOpen);
  usePopupBackHandler(() => {
    if (showLeaveConfirm) setShowLeaveConfirm(false);
    else if (kickTarget) setKickTarget(null);
  }, anyConfirmOpen);

  const currentUserId = getCurrentUserId() || "current_user";

  const load = useCallback(async () => {
    // 后端优先：真实成员资料
    try {
      const r = await fetchGroupDetail(groupId);
      if (r.success && r.group) {
        setGroup(r.group);
        setMembers(r.members || []);
        setAnnouncementText(r.group.announcement || "");
        setNameText(r.group.name);
        setOnline(true);
        return;
      }
    } catch {}
    // 本地兜底
    const found = getGroups().find((g) => g.id === groupId);
    if (found) {
      setGroup({
        id: found.id, groupId: found.id, name: found.name,
        ownerId: found.ownerId, ownerName: "",
        announcement: found.announcement || "",
        memberIds: found.members.map((m) => m.userId),
        createdAt: "",
      });
      setMembers(found.members.map((m) => ({ userId: m.userId, nickname: m.name, avatar: m.avatar || "", memberLevel: 0 })));
      setAnnouncementText(found.announcement || "");
      setNameText(found.name);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  const isOwner = group?.ownerId === currentUserId;

  const handleSaveAnnouncement = async () => {
    if (!group) return;
    if (online) {
      const r = await updateGroupRemote(groupId, { announcement: announcementText });
      if (!r.success) { flash(r.error || "保存失败"); return; }
      if (r.group) setGroup(r.group);
    } else {
      flash("当前为本地模式，公告仅本机生效");
    }
    setIsEditingAnnouncement(false);
  };

  const handleSaveName = async () => {
    if (!group || !nameText.trim()) { flash("群名称不能为空"); return; }
    if (online) {
      const r = await updateGroupRemote(groupId, { name: nameText.trim() });
      if (!r.success) { flash(r.error || "保存失败"); return; }
      if (r.group) setGroup(r.group);
    } else {
      setGroup({ ...group, name: nameText.trim() });
    }
    setIsEditingName(false);
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    if (online) {
      const r = await leaveGroup(groupId);
      if (!r.success) { flash(r.error || "操作失败"); return; }
      flash(r.dissolved ? "该群已解散" : "已退出群聊");
    }
    router.push("/groups");
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    if (online) {
      const r = await kickGroupMember(groupId, kickTarget.userId);
      if (!r.success) { flash(r.error || "操作失败"); return; }
      setMembers((prev) => prev.filter((m) => m.userId !== kickTarget.userId));
      if (group) setGroup({ ...group, memberIds: group.memberIds.filter((id) => id !== kickTarget.userId) });
      flash(`已移除 ${kickTarget.nickname}`);
    } else {
      flash("本地模式暂不支持移除成员");
    }
    setKickTarget(null);
  };

  if (!group) {
    return (
      <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "420px", margin: "0 auto" }}>
        <PageLoginGuard />
        <BrandHeader title="群信息" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "420px", margin: "0 auto" }}>
      <BrandHeader title="群信息" showBack />

      <div className="flex-1 overflow-y-auto">
        {/* 群基本信息 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-5">
          <div className="flex flex-col items-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-white font-bold mb-3"
              style={{ backgroundColor: BRAND, fontSize: "32px" }}
            >
              {group.name.slice(0, 1)}
            </div>
            {isEditingName ? (
              <div className="flex w-full items-center gap-2">
                <input
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value.slice(0, 30))}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center"
                />
                <button onClick={handleSaveName} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
                  保存
                </button>
                <button onClick={() => { setIsEditingName(false); setNameText(group.name); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600">
                  取消
                </button>
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-800" onClick={() => isOwner && setIsEditingName(true)}>
                {group.name}
                {isOwner && <span className="ml-1.5 text-[11px] font-normal" style={{ color: BRAND }}>点击改名</span>}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">群ID: {group.id} · 群主: {group.ownerName || group.ownerId.slice(-4)}</p>
            {!online && <p className="mt-1 text-[10px] text-orange-400">本地模式：数据仅本机可见</p>}
          </div>
        </div>

        {/* 群公告 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">群公告</p>
            {isOwner && !isEditingAnnouncement && (
              <button onClick={() => setIsEditingAnnouncement(true)} className="text-xs font-medium" style={{ color: BRAND }}>
                编辑
              </button>
            )}
          </div>

          {isEditingAnnouncement ? (
            <div>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value.slice(0, 200))}
                placeholder="输入群公告..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none resize-none"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => { setIsEditingAnnouncement(false); setAnnouncementText(group.announcement || ""); }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600"
                >
                  取消
                </button>
                <button onClick={handleSaveAnnouncement} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{group.announcement || "暂无群公告"}</p>
          )}
        </div>

        {/* 成员列表 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">群成员（{members.length}）</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{ backgroundColor: member.userId === group.ownerId ? "#f59e0b" : BRAND, fontSize: "14px" }}
                >
                  {member.avatar || member.nickname.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {member.nickname}
                    {member.userId === currentUserId && <span className="text-xs text-gray-400 ml-1">(我)</span>}
                  </p>
                </div>
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: member.userId === group.ownerId ? "#f59e0b15" : BRAND + "15",
                    color: member.userId === group.ownerId ? "#f59e0b" : BRAND,
                  }}
                >
                  {member.userId === group.ownerId ? "群主" : "成员"}
                </span>
                {isOwner && member.userId !== currentUserId && (
                  <button onClick={() => setKickTarget(member)} className="text-xs" style={{ color: "#ef4444" }}>
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-3 pb-4">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: "#ef4444" }}
          >
            {isOwner ? "退出群聊（自动转让群主）" : "退出群聊"}
          </button>
          {msg && <div className="mt-2 text-center text-xs" style={{ color: BRAND }}>{msg}</div>}
        </div>
      </div>

      {/* 退群确认弹窗 */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-8 w-full max-w-xs rounded-xl bg-white p-5">
            <p className="mb-2 text-center text-sm font-semibold text-gray-800">确认退出群聊?</p>
            <p className="mb-4 text-center text-xs text-gray-500">
              {isOwner ? "你是群主，退出后群主将转让给最早入群成员；若你是最后一名成员，该群将解散" : "退出后你将无法查看群聊消息"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600">
                取消
              </button>
              <button onClick={handleLeaveGroup} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 踢人确认弹窗 */}
      {kickTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-8 w-full max-w-xs rounded-xl bg-white p-5">
            <p className="mb-2 text-center text-sm font-semibold text-gray-800">确认移除 {kickTarget.nickname}?</p>
            <p className="mb-4 text-center text-xs text-gray-500">移除后对方将不再接收本群消息，可再次申请入群</p>
            <div className="flex gap-3">
              <button onClick={() => setKickTarget(null)} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600">
                取消
              </button>
              <button onClick={handleKick} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
