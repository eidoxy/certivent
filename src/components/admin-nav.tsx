"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", match: (path: string) => path === "/admin" },
  { href: "/admin/events", label: "Events", match: (path: string) => path.startsWith("/admin/events") },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex items-center gap-1 border-b pb-3">
      {ADMIN_LINKS.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Button
            key={href}
            variant={active ? "secondary" : "ghost"}
            nativeButton={false}
            render={<Link href={href} aria-current={active ? "page" : undefined} />}
          >
            {label}
          </Button>
        );
      })}
    </nav>
  );
}
