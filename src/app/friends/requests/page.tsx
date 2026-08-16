"use client";

import React, { useState, useEffect } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getFriendRequests,
  updateFriendRequest,
  addFriend,
  type FriendRequest,
} from "@/lib/socialStore";
import {
  fetchFriendRequests as apiFetchFriendRequests,
  respondFriendRequest as apiRespondFriendRequest,
} from "@/lib/socialApi";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function FriendRequestsPage() {
  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "friends_requests",
  });

  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    setRequests(getFriendRequests());
    // v25.0.19：合并后端真实好友申请（其他用户发送的申请）
    void apiFetchFriendRequests().then((r) => {
      const serverReqsRaw = r && r.success ? r.requests : undefined;
      if (serverReqsRaw) {
        setRequests((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const serverReqs: FriendRequest[] = serverReqsRaw
            .filter((x) => !ids.has(x.id))
            .map((x) => ({
              id: x.id,
              fromId: x.fromId,
              fromName: x.fromName || "言道用户",
              fromAvatar: x.fromName?.slice(0, 1) || "友",
              message: x.message || "",
              status: "pending" as const,
              createdAt: x.createdAt,
            }));
          return [...serverReqs, ...prev];
        });
      }
    }).catch(() => {});
  }, []);

  const refresh = () => {
    setRequests([...getFriendRequests()]);
    void apiFetchFriendRequests().then((r) => {
      const serverReqsRaw = r && r.success ? r.requests : undefined;
      if (serverReqsRaw) {
        setRequests((prev) => {
          const localById = new Map(prev.map((x) => [x.id, x]));
          for (const x of serverReqsRaw) {
            if (!localById.has(x.id)) {
              localById.set(x.id, {
                id: x.id,
                fromId: x.fromId,
                fromName: x.fromName || "言道用户",
                fromAvatar: x.fromName?.slice(0, 1) || "友",
                message: x.message || "",
                status: "pending" as const,
                createdAt: x.createdAt,
              });
            }
          }
          return [...localById.values()];
        });
      }
    }).catch(() => {});
  };

  const handleAccept = (req: FriendRequest) => {
    updateFriendRequest(req.id, "accepted");
    addFriend({
      id: req.fromId,
      name: req.fromName,
      avatar: req.fromAvatar,
      online: false,
      lastSeen: new Date().toISOString(),
      note: "",
      tags: [],
      addedAt: new Date().toISOString(),
    });
    if (/^\d+$/.test(req.id)) {
      void apiRespondFriendRequest(req.id, "accept").catch(() => {});
    }
    refresh();
  };

  const handleReject = (req: FriendRequest) => {
    updateFriendRequest(req.id, "rejected");
    if (/^\d+$/.test(req.id)) {
      void apiRespondFriendRequest(req.id, "reject").catch(() => {});
    }
    refresh();
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter(
    (r) => r.status === "accepted" || r.status === "rejected"
  );

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: "待处理", color: "#f59e0b" },
    accepted: { text: "已通过", color: "#10b981" },
    rejected: { text: "已拒绝", color: "#ef4444" },
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
  <PageLoginGuard />
      <BrandHeader title="好友请求" showBack />

      <div className="flex-1 overflow-y-auto">
        {pendingRequests.length > 0 && (
          <div className="mt-3 mx-3">
            <p className="text-xs text-gray-500 mb-2 px-1">
              待处理 ({pendingRequests.length})
            </p>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl p-4 mb-2 flex items-center gap-3"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "18px",
                  }}
                >
                  {req.fromAvatar || req.fromName.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {req.fromName}
                  </p>
                  {req.message && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {req.message}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString("zh-CN")
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(req)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {processedRequests.length > 0 && (
          <div className="mt-3 mx-3">
            <p className="text-xs text-gray-500 mb-2 px-1">
              已处理 ({processedRequests.length})
            </p>
            {processedRequests.map((req) => {
              const st = statusLabel[req.status];
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-xl p-4 mb-2 flex items-center gap-3"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold"
                    style={{
                      backgroundColor: BRAND,
                      fontSize: "18px",
                    }}
                  >
                    {req.fromAvatar || req.fromName.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {req.fromName}
                    </p>
                    {req.message && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {req.message}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: st.color + "20",
                        color: st.color,
                      }}
                    >
                      {st.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
              style={{ backgroundColor: "#f0e8f9" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BRAND}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">暂无好友请求</p>
            <p className="text-xs text-gray-400 mt-1">
              当有人向你发送好友请求时，会显示在这里
            </p>
          </div>
        )}
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}