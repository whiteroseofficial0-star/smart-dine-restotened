import { requirePage } from "@/server/pages";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePage("admin");
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <AdminNav />
      {children}
    </div>
  );
}
