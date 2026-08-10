"use client";

interface SegBtnOption {
  label: string;
  value: string;
  active: boolean;
}

interface SegBtnProps {
  options: SegBtnOption[];
  onClick: (value: string) => void;
}

export function SegBtn({ options, onClick }: SegBtnProps) {
  return (
    <div className="flex overflow-hidden rounded border border-primary">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onClick(opt.value)}
          className={`flex-1 py-1 text-[13px] border-0 cursor-pointer transition-colors duration-200 ${
            opt.active ? "bg-primary text-white" : "bg-white text-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}