import { Award, ClipboardCheck, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Grid span on large screens (6-column grid: 4 + 2, then 2 + 4). */
  span: string;
  /** Surface tint, so the grid is not four identical white cards. */
  tone: string;
  visual?: React.ReactNode;
};

// Every card describes something the app does today. Reminders and analytics charts are not
// built, so they are deliberately not advertised here.
const FEATURES: Feature[] = [
  {
    title: "Track every registration",
    description:
      "Each sign-up starts as pending. Approve or reject it, then mark who actually attended.",
    icon: ClipboardCheck,
    span: "lg:col-span-4",
    tone: "bg-primary/10 ring-primary/20",
    visual: (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="PENDING" />
        <span className="text-muted-foreground">to</span>
        <StatusBadge status="APPROVED" />
        <span className="text-muted-foreground">to</span>
        <StatusBadge status="ATTENDED" />
      </div>
    ),
  },
  {
    title: "Capacity that holds",
    description: "Spots are counted as people register, so a full event stops taking sign-ups.",
    icon: Users,
    span: "lg:col-span-2",
    tone: "bg-card ring-foreground/10",
  },
  {
    title: "Certificates on file",
    description: "Upload a certificate for anyone marked attended. They download it from My events.",
    icon: Award,
    span: "lg:col-span-2",
    tone: "bg-muted ring-foreground/10",
    visual: (
      <div className="flex gap-2">
        <Badge variant="outline">PDF</Badge>
        <Badge variant="outline">PNG</Badge>
        <Badge variant="outline">JPEG</Badge>
      </div>
    ),
  },
  {
    title: "A clear overview",
    description:
      "See pending registrations and certificates still owed at a glance, then jump straight to the event.",
    icon: LayoutDashboard,
    span: "lg:col-span-4",
    tone: "bg-card ring-foreground/10",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="flex scroll-mt-24 flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="features-heading" className="text-3xl font-semibold tracking-tight text-balance">
          Everything from sign-up to certificate
        </h2>
        <p className="max-w-[60ch] leading-relaxed text-muted-foreground">
          One place to collect registrations, keep attendance and hand participants their certificates.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-6">
        {FEATURES.map(({ title, description, icon: Icon, span, tone, visual }) => (
          <Card key={title} className={cn("transition-colors", span, tone)}>
            <CardHeader className="gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <CardTitle role="heading" aria-level={3} className="text-lg font-semibold">
                {title}
              </CardTitle>
              <CardDescription className="max-w-[48ch] text-base leading-relaxed">{description}</CardDescription>
            </CardHeader>
            {visual ? <CardContent>{visual}</CardContent> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
