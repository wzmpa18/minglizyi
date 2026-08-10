"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
}

export function ToggleSwitch({ checked, onChange, size = "md" }: ToggleSwitchProps) {
  const isSm = size === "sm";
  const trackWidth = isSm ? 28 : 36;
  const trackHeight = isSm ? 16 : 20;
  const knobSize = isSm ? 14 : 16;
  const knobOffset = isSm ? 13 : 18;

  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        position: "relative",
        flexShrink: 0,
        width: `${trackWidth}px`,
        height: `${trackHeight}px`,
        borderRadius: "9999px",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.2s",
        backgroundColor: checked ? "#7B2FBE" : "#d1d5db",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: checked ? `${knobOffset}px` : "2px",
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          borderRadius: "9999px",
          backgroundColor: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}