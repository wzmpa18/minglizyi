// v20.1: Server component wrapper for static export
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page() {
  return <ClientPage />;
}
