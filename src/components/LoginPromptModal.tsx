"use client";

/**
 * 登录提示弹窗 - v20.1 / P1-6 统一适配
 * 未登录用户点击AI/付费功能时弹出，引导用户去登录
 * 登录成功后自动返回原页面
 */

import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

export function LoginPromptModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  useBodyScrollLock(show);
  usePopupBackHandler(onClose, show);

  if (!show) return null;

  const handleGoLogin = () => {
    onClose();
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem("yandao_login_redirect", currentPath);
    }
    router.push("/login");
  };

  return (
    <div
      className="modal-overlay-center"
      onClick={onClose}
    >
      <div
        className="modal-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-center-body">
          <div className="flex flex-col items-center pt-8 pb-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f5f0fa" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BRAND}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M19 7l-1 1-1-1M17 7a1.5 1.5 0 0 1 3 0" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-800">登录后继续操作</h3>
            <p className="mt-1.5 text-sm text-gray-500 text-center px-6">
              此功能需要登录后才能使用，登录后可享受完整服务
            </p>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-gray-600 transition-colors active:bg-gray-100"
              style={{ backgroundColor: "#f5f5f5" }}
            >
              暂不登录
            </button>
            <button
              onClick={handleGoLogin}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: BRAND }}
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
