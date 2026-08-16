// P1 收敛：Server component wrapper for static export（言道精选内容详情）
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [{ category: "physical", id: "placeholder" }];
}

export default function Page() {
  return <ClientPage />;
}
