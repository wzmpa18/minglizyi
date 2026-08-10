// v18.4: Static export support for dynamic route
export function generateStaticParams() {
  return [];
}

export default function DynamicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}