"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BrandHeaderProps {
  title?: string;
  showBack?: boolean;
  backUrl?: string;
  onEdit?: () => void;
  onBack?: () => void;
  color?: string;
  children?: React.ReactNode;
}

export function BrandHeader({ title = "言道排盘", showBack = false, backUrl, onEdit, onBack, color, children }: BrandHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div className="h-10 flex items-center justify-center relative shrink-0 z-[10000]" style={{ backgroundColor: color || "#7B2FBE" }}>
      {showBack && (
        <button
          onClick={handleBack}
          className="absolute left-0 top-0 h-10 w-10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div style={{ textAlign: "center" }}>
        <span className="text-white text-[18px] font-bold">{title}</span>
        <div style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.65, lineHeight: "1.4", color: "white" }}>yandao.vip 分享下载有礼</div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute right-3 top-2 bg-white/20 hover:bg-white/30 border-0 rounded text-white text-xs px-2.5 py-1 cursor-pointer transition-colors"
        >
          编辑
        </button>
      )}
      {children && (
        <div className="absolute left-0 right-0" style={{ top: "100%" }}>
          {children}
        </div>
      )}
    </div>
  );
}