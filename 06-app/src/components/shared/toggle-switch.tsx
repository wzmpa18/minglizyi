"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
}

export function ToggleSwitch({ checked, onChange, size = "md" }: ToggleSwitchProps) {
  const isSm = size === "sm";
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative shrink-0 rounded-full border-0 cursor-pointer transition-colors duration-200 ${
        isSm ? "w-7 h-4" : "w-9 h-5"
      } ${checked ? "bg-primary" : "bg-gray-300"}`}
    >
      <span
        className={`absolute rounded-full bg-white shadow-sm transition-all duration-200 ${
          isSm
            ? `top-px h-3.5 w-3.5 ${checked ? "left-[13px]" : "left-px"}`
            : `top-0.5 h-4 w-4 ${checked ? "left-[18px]" : "left-0.5"}`
        }`}
      />
    </button>
  );
}