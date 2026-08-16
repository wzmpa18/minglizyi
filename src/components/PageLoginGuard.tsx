"use client";

import { useEffect, useState } from "react";
import { getLoginState } from "@/lib/auth";
import { LoginPromptModal } from "@/components/LoginPromptModal";

/**
 * 页面级登录守卫 - P1 冻结前审计补齐
 *
 * 游客直接访问需登录页面（订单/记录/客户/消息/群聊/个人中心子页等）时，
 * 挂载即弹出登录引导弹窗；登录成功后自动返回原页面（LoginPromptModal 内置回跳）。
 *
 * 用法：在页面根元素内任意位置渲染 <PageLoginGuard /> 即可。
 */
export function PageLoginGuard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const s = getLoginState();
    if (!s.isLoggedIn) setShow(true);
  }, []);

  return <LoginPromptModal show={show} onClose={() => setShow(false)} />;
}
