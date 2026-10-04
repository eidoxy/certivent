import Link from "next/link";
import { CalendarCheck } from "lucide-react";

// Brand mark shared by the site navbar and the landing footer: an icon chip plus the wordmark.
export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="Certivent home"
      className="flex items-center gap-2 rounded-md text-base font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck aria-hidden="true" className="size-4" />
      </span>
      Certivent
    </Link>
  );
}
