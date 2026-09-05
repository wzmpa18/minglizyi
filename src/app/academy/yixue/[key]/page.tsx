// v25.0.80 IOS-4.3B-RECOVERY：易学学习中心学科页（静态导出 wrapper）
import ClientPage from "./ClientPage";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";

export function generateStaticParams() {
  return YIXUE_SUBJECTS.map((s) => ({ key: s.key }));
}

export default function Page() {
  return <ClientPage />;
}
