import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/authz";

export default async function Home() {
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user) redirect("/events");

  return (
    <section className="grid gap-10 py-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-end md:py-20">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
          Event registration and certificates, in one place.
        </h1>
        <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Find an event, register in a click, and download your participation certificate once the
          organizer issues it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="px-4" nativeButton={false} render={<Link href="/events" />}>
            Browse events
          </Button>
          <Button size="lg" variant="outline" className="px-4" nativeButton={false} render={<Link href="/register" />}>
            Sign up
          </Button>
        </div>
      </div>
      {/* TODO: hero visual (event photo or real product screenshot, ~1200x900). Left empty on purpose
          rather than faking one; see the UI refactor report. */}
    </section>
  );
}
