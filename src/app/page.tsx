import { redirect } from "next/navigation";
import { CtaBanner, LandingFooter } from "@/components/landing/cta-footer";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { LivePreview } from "@/components/landing/live-preview";
import { Testimonials } from "@/components/landing/testimonials";
import { getSessionUser } from "@/lib/authz";

export default async function Home() {
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user) redirect("/events");

  // Visitors only. The marketing content below is illustrative; signed-in users never see it.
  // pt-16 clears the fixed navbar (top-4 + h-14) so it never covers the hero.
  return (
    <>
      <div className="flex flex-col gap-20 md:gap-24">
        <Hero />
        <Features />
        <LivePreview />
        <Testimonials />
        <div className="flex flex-col gap-12">
          <CtaBanner />
          <LandingFooter />
        </div>
      </div>
    </>
  );
}
