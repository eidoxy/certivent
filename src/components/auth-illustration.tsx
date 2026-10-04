import { Award, CalendarCheck } from "lucide-react";

/**
 * PLACEHOLDER illustration for the auth pages. No illustration asset exists in the repo and the page
 * must not depend on an external image, so this is a deep-blue brand panel (same --brand token as the
 * landing hero) with a logo chip, two lines of copy and a large faint icon.
 *
 * To use a real illustration later, drop a file in /public (about 960x1200, for example
 * /public/auth-illustration.webp) and render it with next/image inside this <aside>, with empty alt
 * text because it is decorative.
 *
 * It fills the left cell of the shared auth container, which clips it with overflow-hidden, so the
 * oversized icon can never widen the page. Hidden below lg so the form comes first on phones.
 */
export function AuthIllustration() {
  return (
    <aside className="relative hidden flex-col justify-between gap-10 bg-brand p-8 text-brand-foreground lg:flex">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <CalendarCheck className="size-5" />
      </span>
      <div className="relative flex max-w-xs flex-col gap-2">
        <p className="text-2xl leading-tight font-semibold tracking-tight text-balance">
          From sign-up to certificate.
        </p>
        <p className="text-sm leading-relaxed text-brand-foreground/80">
          Register for an event, get approved, and download your certificate once it is issued.
        </p>
      </div>
      <Award
        aria-hidden="true"
        strokeWidth={1}
        className="pointer-events-none absolute -right-10 -bottom-10 size-64 text-brand-foreground/10"
      />
    </aside>
  );
}
