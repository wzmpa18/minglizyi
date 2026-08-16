"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getGroups,
  updateGroup,
  deleteGroup,
  type GroupInfo,
  type GroupMember,
} from "@/lib/socialStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function GroupInfoPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "group_info_" + groupId,
  });

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);

  // P1 弹窗规范：退群/解散确认弹窗 —— 返回键优先关闭弹窗 + 背景滚动锁
  const anyConfirmOpen = showLeaveConfirm || showDisbandConfirm;
  useBodyScrollLock(anyConfirmOpen);
  usePopupBackHandler(() => {
    if (showLeaveConfirm) setShowLeaveConfirm(false);
    else if (showDisbandConfirm) setShowDisbandConfirm(false);
  }, anyConfirmOpen);

  const currentUserId = "current_user";
  const currentUserName = "我";

  useEffect(() => {
    const groups = getGroups();
    const found = groups.find((g) => g.id === groupId);
    if (found) {
      setGroup(found);
      setAnnouncementText(found.announcement || "");
    }
  }, [groupId]);

  const refresh = () => {
    const groups = getGroups();
    const found = groups.find((g) => g.id === groupId);
    if (found) {
      setGroup(found);
    }
  };

  const isOwner = group?.ownerId === currentUserId;
  const isAdmin = group?.members.some(
    (m) => m.userId === currentUserId && m.role === "admin"
  );
  const canEdit = isOwner || isAdmin;
  const currentMember = group?.members.find((m) => m.userId === currentUserId);

  const handleSaveAnnouncement = () => {
    if (!group) return;
    updateGroup(groupId, { announcement: announcementText });
    setIsEditingAnnouncement(false);
    refresh();
  };

  const handleLeaveGroup = () => {
    if (!group) return;
    const updatedMembers = group.members.filter(
      (m) => m.userId !== currentUserId
    );
    updateGroup(groupId, { members: updatedMembers });
    router.push("/groups");
  };

  const handleDisbandGroup = () => {
    deleteGroup(groupId);
    router.push("/groups");
  };

  const roleLabel: Record<string, string> = {
    owner: "群主",
    admin: "管理员",
    member: "成员",
  };

  const roleColor: Record<string, string> = {
    owner: "#f59e0b",
    admin: BRAND,
    member: "#999",
  };

  if (!group) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
  <PageLoginGuard />
        <BrandHeader title="群信息" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="群信息" showBack />

      <div className="flex-1 overflow-y-auto">
        {/* 群基本信息 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-5">
          <div className="flex flex-col items-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-white font-bold mb-3"
              style={{
                backgroundColor: BRAND,
                fontSize: "32px",
              }}
            >
              {group.avatar || group.name.slice(0, 1)}
            </div>
            <p className="text-lg font-bold text-gray-800">{group.name}</p>
            <p className="text-xs text-gray-400 mt-1">群ID: {group.id}</p>

            {group.tags && group.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                {group.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: BRAND + "15",
                      color: BRAND,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 群公告 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">群公告</p>
            {canEdit && !isEditingAnnouncement && (
              <button
                onClick={() => setIsEditingAnnouncement(true)}
                className="text-xs font-medium"
                style={{ color: BRAND }}
              >
                编辑
              </button>
            )}
          </div>

          {isEditingAnnouncement ? (
            <div>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="输入群公告..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ outline: "none" }}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => {
                    setIsEditingAnnouncement(false);
                    setAnnouncementText(group.announcement || "");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAnnouncement}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {group.announcement || "暂无群公告"}
            </p>
          )}
        </div>

        {/* 成员列表 */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            群成员 ({group.members.length}/{group.maxMembers})
          </p>
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "14px",
                  }}
                >
                  {member.avatar || member.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span className="text-xs text-gray-400 ml-1">(我)</span>
                    )}
                  </p>
                </div>
                <span
                  className="text-xs rounded px-2 py-0.5 font-medium"
                  style={{
                    backgroundColor: roleColor[member.role] + "15",
                    color: roleColor[member.role],
                  }}
                >
                  {roleLabel[member.role]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-3 pb-4 space-y-2">
          {isOwner ? (
            <button
              onClick={() => setShowDisbandConfirm(true)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#ef4444" }}
            >
              解散群聊
            </button>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#ef4444" }}
            >
              退出群聊
            </button>
          )}
        </div>
      </div>

      {/* 退群确认弹窗 */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl mx-8 p-5 w-full max-w-xs">
            <p className="text-sm font-semibold text-gray-800 text-center mb-2">
              确认退出群聊?
            </p>
            <p className="text-xs text-gray-500 text-center mb-4">
              退出后你将无法查看群聊消息
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "#ef4444" }}
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解散群确认弹窗 */}
      {showDisbandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl mx-8 p-5 w-full max-w-xs">
            <p className="text-sm font-semibold text-gray-800 text-center mb-2">
              确认解散群聊?
            </p>
            <p className="text-xs text-gray-500 text-center mb-4">
              解散后所有成员将被移出，此操作不可撤销
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisbandConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleDisbandGroup}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "#ef4444" }}
              >
                确认解散
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