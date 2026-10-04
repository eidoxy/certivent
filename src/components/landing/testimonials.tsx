import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  className?: string;
  featured?: boolean;
};

// Placeholder quotes for layout only. They are not from real customers and the page says so.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Sign-ups used to live in three spreadsheets. Now I open one page, approve the queue and get on with the day.",
    name: "Rizka Amalia",
    role: "Community organizer, weekend learning group",
    initials: "RA",
    featured: true,
    className: "lg:col-span-3 lg:row-span-2",
  },
  {
    quote: "Our workshop certificates went out the same afternoon. People stopped messaging me for them.",
    name: "Dimas Prakoso",
    role: "Owner, small craft studio",
    initials: "DP",
    className: "lg:col-span-2",
  },
  {
    quote: "The capacity limit alone saved me from overbooking our weekend class.",
    name: "Maya Lestari",
    role: "Owner, neighbourhood bakery",
    initials: "ML",
    className: "lg:col-span-2",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="flex scroll-mt-24 flex-col gap-8"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="testimonials-heading" className="text-3xl font-semibold tracking-tight text-balance">
          Made for small, busy organizers
        </h2>
        <p className="text-sm text-muted-foreground">
          Sample quotes for illustration. They are not from real customers.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        {TESTIMONIALS.map(({ quote, name, role, initials, className, featured }) => (
          <Card key={name} className={cn("justify-between", className)}>
            <CardContent>
              <figure className="flex h-full flex-col justify-between gap-6">
                <blockquote>
                  <p
                    className={cn(
                      "leading-relaxed text-balance",
                      featured ? "text-2xl font-medium tracking-tight" : "text-base",
                    )}
                  >
                    &ldquo;{quote}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">{role}</span>
                  </span>
                </figcaption>
              </figure>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
