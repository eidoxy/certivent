import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/authz";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();

  return (
    <div className="flex flex-col gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
