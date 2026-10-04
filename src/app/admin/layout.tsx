import { requireAdminPage } from "@/lib/authz";

// Admin navigation lives in the global floating navbar (see SiteHeader), so this layout only
// enforces the admin guard.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();

  return <div className="flex flex-col gap-6">{children}</div>;
}
