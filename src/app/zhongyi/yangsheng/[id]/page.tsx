import { SectionGate } from "@/components/SectionGate";
// v20.1: Server component wrapper for static export
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

function PageOriginal() {
  return <ClientPage />;
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function Page() {
  return (
    <SectionGate toolId="zhongyi_yangsheng" title="养生功法">
      <PageOriginal />
    </SectionGate>
  );
}
