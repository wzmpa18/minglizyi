"use client";
import {InterfaceButton} from "@/components/InterfaceControls";

import { interfaceText as ui, useInterfaceLocale } from "@/lib/interfaceLocale";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PUBLIC_PROMOTION_ENABLED } from "@/lib/releaseFeatures";
import {studyParentHref} from "@/lib/studyParentNavigation";

interface BrandHeaderProps {
  title?: string;
  showBack?: boolean;
  backUrl?: string;
  onEdit?: () => void;
  onBack?: () => void;
  onTitleClick?: () => void;
  color?: string;
  children?: React.ReactNode;
}

export function BrandHeader({ title = "言道排盘", showBack = false, backUrl, onEdit, onBack, onTitleClick, color, children }: BrandHeaderProps) {
  useInterfaceLocale();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl&&backUrl.startsWith("/")&&!backUrl.startsWith("//")) {
      router.replace(backUrl);
    } else {
      router.replace(studyParentHref(window.location.pathname,window.location.search));
    }
  };

  return (
    <div
      className="h-10 flex items-center justify-center relative shrink-0 z-[10000]"
      // v25.0.80: iOS 刘海屏顶栏避让（viewport-fit=cover 下无此 padding 返回键会被灵动岛遮挡）
      style={{ backgroundColor: color || "#7B2FBE", height: "calc(40px + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {showBack && (
        <InterfaceButton
          onClick={handleBack}
          className="absolute left-0 top-0 h-10 w-10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          style={{ top: "env(safe-area-inset-top, 0px)" }}
          aria-label={ui("返回")}
        >
          <ArrowLeft className="w-5 h-5" />
        </InterfaceButton>
      )}
      <div style={{ textAlign: "center" }} onClick={onTitleClick} className={onTitleClick ? "cursor-pointer" : undefined}>
        <span className="text-white text-[18px] font-bold">{ui(title)}</span>
        <div style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.65, lineHeight: "1.4", color: "white" }}>{PUBLIC_PROMOTION_ENABLED ? "yandao.vip 分享下载有礼" : "经典研读 · 传统文化学习"}</div>
      </div>
      {onEdit && (
        <InterfaceButton
          onClick={onEdit}
          className="absolute right-3 top-2 bg-white/20 hover:bg-white/30 border-0 rounded text-white text-xs px-2.5 py-1 cursor-pointer transition-colors"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        >
          编辑
        </InterfaceButton>
      )}
      {children && (
        <div className="absolute left-0 right-0" style={{ top: "100%" }}>
          {children}
        </div>
      )}
    </div>
  );
}
