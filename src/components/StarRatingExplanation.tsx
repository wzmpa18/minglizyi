"use client";

import { useState } from "react";
import { STAR_RATING_EXPLANATION } from "@/lib/dualTrackService";

/**
 * 星级说明弹窗组件
 * 包含圆形问号小图标，点击弹出弹窗
 * 强制使用合规章级说明文案
 */
export default function StarRatingExplanation() {
  const [show, setShow] = useState(false);

  return (
    <>
      {/* 圆形问号小图标 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShow(true);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1px solid #ccc",
          background: "#f5f5f5",
          color: "#999",
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
          marginLeft: 4,
          padding: 0,
          lineHeight: 1,
          verticalAlign: "middle",
        }}
        aria-label="星级说明"
      >
        ?
      </button>

      {/* 弹窗 */}
      {show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: 16,
          }}
          onClick={() => setShow(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              maxWidth: 340,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid #f0f0f0",
                position: "sticky",
                top: 0,
                backgroundColor: "#fff",
                zIndex: 1,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
                {STAR_RATING_EXPLANATION.title}
              </h3>
              <button
                onClick={() => setShow(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f5f5f5",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#666",
                }}
              >
                ✕
              </button>
            </div>

            {/* 正文 */}
            <div style={{ padding: "16px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#333",
                  whiteSpace: "pre-line",
                }}
              >
                {STAR_RATING_EXPLANATION.body}
              </p>

              {/* 重要提示 */}
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  backgroundColor: "#fff8e1",
                  borderRadius: 8,
                  border: "1px solid #ffe082",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#e65100",
                    marginBottom: 4,
                  }}
                >
                  {STAR_RATING_EXPLANATION.importantTitle}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "#bf360c",
                    whiteSpace: "pre-line",
                  }}
                >
                  {STAR_RATING_EXPLANATION.importantBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
