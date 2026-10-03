import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventSummary } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

function AvailabilityBadge({ event }: { event: EventSummary }) {
  if (event.isOpen) return <Badge>Open</Badge>;
  if (event.closedReason === "FULL") return <Badge variant="destructive">Full</Badge>;
  return <Badge variant="secondary">Closed</Badge>;
}

export function EventCard({ event }: { event: EventSummary }) {
  const registered =
    event.capacity === null
      ? `${event.activeCount} registered`
      : `${event.activeCount} / ${event.capacity} registered`;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block h-full rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full transition-colors group-hover:bg-muted">
        <CardHeader>
          <CardTitle>
            <h2>{event.title}</h2>
          </CardTitle>
          <CardAction>
            <AvailabilityBadge event={event} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            {formatDateTime(event.startsAt)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {event.location}
          </p>
          <p className="flex items-center gap-2">
            <Users aria-hidden="true" className="size-4 shrink-0" />
            {registered}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Loading placeholder with the same silhouette as EventCard. */
export function EventCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <CardAction>
          <Skeleton className="h-5 w-12 rounded-4xl" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="h-5 w-40 max-w-full" />
        <Skeleton className="h-5 w-32 max-w-full" />
      </CardContent>
    </Card>
  );
}
