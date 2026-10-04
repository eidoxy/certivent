import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Live preview" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "/events", label: "Browse events" },
  { href: "/login", label: "Login" },
] as const;

export function CtaBanner() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="flex flex-col gap-6 rounded-2xl bg-brand px-6 py-10 text-brand-foreground md:flex-row md:items-center md:justify-between md:px-12"
    >
      <div className="flex max-w-xl flex-col gap-2">
        <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-balance">
          Ready to run your next event?
        </h2>
        <p className="leading-relaxed text-brand-foreground/80">
          Create a free account and publish your first event in minutes.
        </p>
      </div>
      <Button
        size="lg"
        className="h-11 shrink-0 px-5 text-base"
        nativeButton={false}
        render={<Link href="/register" />}
      >
        Get Started for Free
      </Button>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="flex flex-col gap-6">
      <Separator />
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <BrandLogo />
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="text-sm text-muted-foreground">&copy; 2026 Certivent. Event registration and certificates.</p>
    </footer>
  );
}
