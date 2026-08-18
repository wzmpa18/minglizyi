"use client";

import { useEffect } from "react";
import { captureInviteContext } from "@/lib/inviteApi";

// P9-推广中心：全站落地归因捕获
// 邀请链接可指向站内任意页面（/?ref=1&ts=xxx&sig=xxx），此处统一捕获并持久化，
// 注册/验证码登录时由 inviteApi.getInviteContext() 统一读取上送服务端归因。
export default function InviteCaptureInit() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") || params.get("code")) {
        captureInviteContext(params);
      }
    } catch { /* ignore */ }
  }, []);
  return null;
}
