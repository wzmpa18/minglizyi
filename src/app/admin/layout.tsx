import type { Metadata } from "next";
import AdminClientShell from "./ClientShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminClientShell>{children}</AdminClientShell>;
}
