"use client";

import { useEffect, useState } from "react";

// v25.0.49: 版本号动态化——从 /version.json 实时读取当前线上版本，不再硬编码
export default function IcpFooter() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!stopped && data && typeof data.version === "string") setVersion(data.version);
      } catch { /* 静默：保留默认文案 */ }
    })();
    return () => { stopped = true; };
  }, []);

  return (
    <div className="py-3 text-center text-[10px] leading-5 text-gray-400">
      <p>言道 {version || "v25.0"} · 传承国学文化</p>
      <p>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 no-underline active:text-[#7B2FBE]"
        >
          粤ICP备2026071165号-4A
        </a>
      </p>
    </div>
  );
}
