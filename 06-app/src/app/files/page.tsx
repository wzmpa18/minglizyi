"use client";

const THEME = "#7B2FBE";

export default function FilesPage() {
  return (
    <div style={{
      width: "100%",
      maxWidth: "420px",
      margin: "0 auto",
      minHeight: "100vh",
      backgroundColor: "#ededed",
      position: "relative",
      paddingBottom: "72px",
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        height: "40px",
        backgroundColor: THEME,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "18px",
        fontWeight: "bold",
      }}>
        排盘档案
      </div>
      {/* 内容区 */}
      <div style={{
        padding: "20px",
        textAlign: "center",
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "15px",
          padding: "40px 20px",
          marginTop: "40px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
          <div style={{ fontSize: "16px", color: "#666" }}>档案功能开发中</div>
          <div style={{ fontSize: "13px", color: "#999", marginTop: "8px" }}>保存的排盘记录将在这里展示</div>
        </div>
      </div>
    </div>
  );
}
