"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch, queryKeys, type ClosedReason, type EventDetail } from "@/lib/api-client";
import type { RegistrationStatus } from "@/lib/constants";
import { formatDateRange, formatDateTime } from "@/lib/format";

type ViewerRole = "PARTICIPANT" | "ADMIN" | null;

const CLOSED_REASON_TEXT: Record<Exclude<ClosedReason, null>, string> = {
  FULL: "This event is full.",
  DEADLINE_PASSED: "The registration deadline has passed.",
  STARTED: "This event has already started.",
  // The API returns 404 for unpublished events, so this is only a type-level fallback.
  UNPUBLISHED: "Registration is not available for this event.",
};

type EventDetailViewProps = {
  id: string;
  viewerRole: ViewerRole;
};

type RegistrationResult = {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
};

export function EventDetailView({ id, viewerRole }: EventDetailViewProps) {
  const queryClient = useQueryClient();
  const { data: event, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => apiFetch<EventDetail>(`/api/events/${id}`),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.myRegistrations() });
  }

  const register = useMutation<RegistrationResult, ApiError>({
    mutationFn: () => apiFetch<RegistrationResult>(`/api/events/${id}/register`, { method: "POST" }),
    onSuccess: () => {
      toast.success("You're registered. Awaiting approval.");
      invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
      // Refetch so the panel reflects the real state (for example, the event just filled up).
      invalidate();
    },
  });

  const cancel = useMutation<RegistrationResult, ApiError>({
    mutationFn: () => apiFetch<RegistrationResult>(`/api/events/${id}/register`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Registration cancelled.");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isPending) return <EventDetailSkeleton />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              <h1>Event not found</h1>
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/events" />}>
              Back to events
            </Button>
          </EmptyContent>
        </Empty>
      );
    }
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this event</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError
            ? error.message
            : "The server could not be reached. Check your connection and try again."}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Spinner data-icon="inline-start" />}
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const dateLines = formatDateRange(event.startsAt, event.endsAt);
  const capacityText =
    event.capacity === null ? "Unlimited" : `${event.activeCount} / ${event.capacity}`;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{event.title}</h1>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-sm text-muted-foreground">Date and time</dt>
          <dd>
            {dateLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </dd>
          <dt className="text-sm text-muted-foreground">Location</dt>
          <dd className="wrap-break-word">{event.location}</dd>
          <dt className="text-sm text-muted-foreground">Capacity</dt>
          <dd>{capacityText}</dd>
          <dt className="text-sm text-muted-foreground">Registration closes</dt>
          <dd>{formatDateTime(event.registrationDeadline ?? event.startsAt)}</dd>
        </dl>

        <Separator />

        <section aria-labelledby="event-description-heading" className="flex flex-col gap-2">
          <h2 id="event-description-heading" className="text-base font-medium">
            About this event
          </h2>
          <p className="max-w-[65ch] leading-relaxed wrap-break-word whitespace-pre-line">
            {event.description}
          </p>
        </section>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Registration</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ActionPanel
            event={event}
            viewerRole={viewerRole}
            onRegister={() => register.mutate()}
            onCancel={() => cancel.mutate()}
            pending={register.isPending || cancel.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ActionPanel({
  event,
  viewerRole,
  onRegister,
  onCancel,
  pending,
}: {
  event: EventDetail;
  viewerRole: ViewerRole;
  onRegister: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  if (viewerRole === null) {
    return (
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href={`/login?callbackUrl=${encodeURIComponent(`/events/${event.id}`)}`} />}
      >
        Log in to register
      </Button>
    );
  }

  if (viewerRole === "ADMIN") {
    return (
      <>
        <p className="text-sm text-muted-foreground">Administrators cannot register for events.</p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/admin/events/${event.id}/participants`} />}
        >
          Manage participants
        </Button>
      </>
    );
  }

  const registration = event.myRegistration;

  if (registration === null || registration.status === "CANCELLED") {
    if (!event.isOpen) {
      return (
        <>
          <Button size="lg" disabled>
            Registration closed
          </Button>
          {event.closedReason && (
            <p className="text-sm text-muted-foreground">{CLOSED_REASON_TEXT[event.closedReason]}</p>
          )}
        </>
      );
    }
    return (
      <>
        {registration?.status === "CANCELLED" && (
          <p className="text-sm text-muted-foreground">
            You cancelled this registration. You can register again.
          </p>
        )}
        <Button size="lg" onClick={onRegister} disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Register
        </Button>
      </>
    );
  }

  switch (registration.status) {
    case "PENDING":
    case "APPROVED":
      return (
        <>
          <StatusBadge status={registration.status} />
          <p className="text-sm text-muted-foreground">
            {registration.status === "PENDING"
              ? "Your registration is awaiting approval."
              : "You're confirmed for this event."}
          </p>
          {event.closedReason !== "STARTED" && <CancelRegistrationDialog onConfirm={onCancel} pending={pending} />}
        </>
      );
    case "ATTENDED":
      return (
        <>
          <StatusBadge status="ATTENDED" />
          <Button variant="outline" nativeButton={false} render={<Link href="/my-events" />}>
            Go to My events
          </Button>
        </>
      );
    case "REJECTED":
      return (
        <>
          <StatusBadge status="REJECTED" />
          <p className="text-sm text-muted-foreground">Your registration was not accepted.</p>
        </>
      );
  }
}

/** Confirmation step before cancelling. AlertDialogAction is a plain Button here, so it closes the dialog itself. */
function CancelRegistrationDialog({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" disabled={pending} />}>
        {pending && <Spinner data-icon="inline-start" />}
        Cancel registration
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
          <AlertDialogDescription>
            You can register again later if spots are still available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep registration</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Cancel registration
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Loading placeholder with the same layout as the loaded event. */
function EventDetailSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
      <p role="status" className="sr-only">
        Loading event
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-9 w-3/4" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="contents">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-56 max-w-full" />
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-[65ch]" />
          <Skeleton className="h-4 w-full max-w-[65ch]" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
