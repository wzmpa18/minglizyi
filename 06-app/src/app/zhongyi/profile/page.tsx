import { BrandHeader } from "@/components/shared";

export default function ZhongyiProfilePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <BrandHeader title="我的" showBack={true} backUrl="/zhongyi" />
      <h2 className="text-lg font-semibold mb-4">我的 — 中医</h2>
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4 text-sm">学习收藏</div>
        <div className="rounded-lg border bg-card p-4 text-sm">做题记录</div>
        <div className="rounded-lg border bg-card p-4 text-sm">学习进度</div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">数据与全局个人中心同源，不单独存储。</p>
    </div>
  );
}