"use client";

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-lg px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`}>
      {children}
    </div>
  );
}

interface LabelValueProps {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}

export function LabelValue({ label, children, labelClassName = "", valueClassName = "" }: LabelValueProps) {
  return (
    <tr>
      <td className={`text-[13px] text-[#999] text-right pr-1 align-top ${labelClassName}`}>
        {label}：
      </td>
      <td className={`text-[13px] text-[#333] ${valueClassName}`}>{children}</td>
    </tr>
  );
}

interface QuickBtnGroupProps {
  items: { label: string; onClick: () => void }[];
}

export function QuickBtnGroup({ items }: QuickBtnGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          className="border border-[#e8e8e8] rounded px-2 py-0.5 text-xs text-[#888] bg-white cursor-pointer hover:bg-gray-50"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}