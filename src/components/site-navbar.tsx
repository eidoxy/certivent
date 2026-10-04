"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type NavLink = {
  href: string;
  label: string;
  /** Highlight only on this exact path (for example the admin dashboard), not on nested paths. */
  exact?: boolean;
};

export type NavUser = { name: string; role: "PARTICIPANT" | "ADMIN" };

type SiteNavbarProps = {
  links: readonly NavLink[];
  /** Primary call to action. Null when the current role has none. */
  cta: { href: string; label: string } | null;
  /** Null for visitors. */
  user: NavUser | null;
  /** Server action passed down from <SiteHeader>; this component only renders the form. */
  signOutAction: () => Promise<void>;
};

function isActive(pathname: string, { href, exact }: NavLink) {
  // Section anchors on the landing page (for example /#features) are never "current".
  if (href.includes("#")) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// Floating bar used on every page. Its width and padding classes match the <main> container in
// the root layout, so the bar's edges line up with the page content below it. Links and actions
// are decided on the server (see <SiteHeader>); this component is presentation plus menu state.
export function SiteNavbar({ links, cta, user, signOutAction }: SiteNavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes the mobile menu, the usual expectation for a disclosure.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="fixed inset-x-0 top-4 z-50">
      <div className="container mx-auto w-full max-w-5xl px-4">
        <Collapsible
          open={open}
          onOpenChange={setOpen}
          className="rounded-2xl border border-neutral-200 bg-background/80 shadow-md shadow-black/5 backdrop-blur-md dark:border-neutral-800 [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
        >
          <div className="flex h-14 items-center justify-between gap-4 px-4">
            <BrandLogo />

            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {links.map((link) => {
                  const active = isActive(pathname, link);
                  return (
                    <li key={link.href}>
                      <Button
                        variant={active ? "secondary" : "ghost"}
                        nativeButton={false}
                        render={<Link href={link.href} aria-current={active ? "page" : undefined} />}
                      >
                        {link.label}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <span className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline">
                    {user.name}
                  </span>
                  <form action={signOutAction}>
                    <Button type="submit" variant="ghost">
                      Log out
                    </Button>
                  </form>
                </>
              ) : (
                <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                  Login
                </Button>
              )}
              {cta ? (
                <Button nativeButton={false} render={<Link href={cta.href} />}>
                  {cta.label}
                </Button>
              ) : null}
            </div>

            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={open ? "Close menu" : "Open menu"}
                />
              }
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="md:hidden">
            <div className="flex flex-col gap-4 border-t border-neutral-200 px-4 pt-3 pb-4 dark:border-neutral-800">
              <nav aria-label="Mobile">
                <ul className="flex flex-col gap-1">
                  {links.map((link) => {
                    const active = isActive(pathname, link);
                    return (
                      <li key={link.href}>
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          className="h-10 w-full justify-start px-3 text-base"
                          nativeButton={false}
                          render={
                            <Link href={link.href} onClick={close} aria-current={active ? "page" : undefined} />
                          }
                        >
                          {link.label}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="flex flex-col gap-2">
                {user ? (
                  <>
                    <p className="px-1 text-sm text-muted-foreground">
                      Signed in as <span className="font-medium text-foreground">{user.name}</span>
                    </p>
                    {cta ? (
                      <Button
                        className="h-10 text-base"
                        nativeButton={false}
                        render={<Link href={cta.href} onClick={close} />}
                      >
                        {cta.label}
                      </Button>
                    ) : null}
                    <form action={signOutAction}>
                      <Button type="submit" variant="outline" className="h-10 w-full text-base">
                        Log out
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="h-10 text-base"
                      nativeButton={false}
                      render={<Link href="/login" onClick={close} />}
                    >
                      Login
                    </Button>
                    {cta ? (
                      <Button
                        className="h-10 text-base"
                        nativeButton={false}
                        render={<Link href={cta.href} onClick={close} />}
                      >
                        {cta.label}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
