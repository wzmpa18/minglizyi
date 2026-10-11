import Link from "next/link";

export default function StoreFeatureUnavailable() {
  return (
    <main style={{ minHeight: "100dvh", maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center", background: "#fff" }}>
      <div style={{ fontSize: 48, marginBottom: 18 }}>📚</div>
      <h1 style={{ fontSize: 20, color: "#2D1A3E", marginBottom: 10 }}>当前版本暂不提供此功能</h1>
      <p style={{ fontSize: 14, lineHeight: 1.8, color: "#777", marginBottom: 24 }}>您可以继续使用国学学习、典籍阅读、题库练习和本地排盘工具。</p>
      <Link href="/" style={{ display: "inline-block", padding: "11px 26px", borderRadius: 12, background: "#7B2FBE", color: "#fff", textDecoration: "none", fontWeight: 700 }}>返回首页</Link>
    </main>
  );
}
