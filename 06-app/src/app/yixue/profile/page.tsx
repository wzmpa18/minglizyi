import { BrandHeader } from "@/components/shared";

export default function YixueProfilePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <BrandHeader title="我的" showBack={true} backUrl="/yixue" />
      <h2 className="text-lg font-semibold mb-4">我的 — 易学</h2>
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4 text-sm">排盘历史</div>
        <div className="rounded-lg border bg-card p-4 text-sm">我的收藏</div>
        <div className="rounded-lg border bg-card p-4 text-sm">设置</div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">数据与全局个人中心同源，不单独存储。</p>
    </div>
  );
}