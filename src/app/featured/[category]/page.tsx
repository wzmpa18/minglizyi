// P1 收敛：Server component wrapper for static export（言道精选分类列表）
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [{ category: "physical" }, { category: "digital" }, { category: "consult" }, { category: "course" }];
}

export default function Page() {
  return <ClientPage />;
}
