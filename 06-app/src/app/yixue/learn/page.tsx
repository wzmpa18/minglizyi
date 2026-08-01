import { BrandHeader } from "@/components/shared";

export default function YixueLearnPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <BrandHeader title="学习" showBack={true} backUrl="/yixue" />
      <h2 className="text-lg font-semibold mb-4">典籍库</h2>
      <p className="text-sm text-muted-foreground mb-4">命理相关古籍原文，按分类收纳，仅供学习研究。</p>
      <div className="grid grid-cols-2 gap-3">
        {["《渊海子平》", "《三命通会》", "《滴天髓》", "《穷通宝鉴》", "《紫微斗数全书》", "《奇门遁甲秘笈》"].map((name) => (
          <div key={name} className="rounded-lg border bg-card p-3 text-center text-sm hover:shadow-sm cursor-pointer transition-all">
            {name}
          </div>
        ))}
      </div>
      <h2 className="text-lg font-semibold mt-8 mb-4">基础教程</h2>
      <p className="text-sm text-muted-foreground">公开课程嵌入位，后续可接入B站公开课程链接。</p>
    </div>
  );
}