"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Ticket } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiFetch, queryKeys, type MyRegistration } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";

const SKELETON_ROWS = 4;

const HEAD_CLASS = "px-4";
const CELL_CLASS = "px-4 py-3";

function RegistrationsTableHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className={HEAD_CLASS}>Event</TableHead>
        <TableHead className={HEAD_CLASS}>Date</TableHead>
        <TableHead className={HEAD_CLASS}>Status</TableHead>
        <TableHead className={HEAD_CLASS}>Certificate</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function MyRegistrations() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.myRegistrations(),
    queryFn: () => apiFetch<MyRegistration[]>("/api/me/registrations"),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">My events</h1>

      {isPending ? (
        <div aria-busy="true" className="rounded-xl border">
          <p role="status" className="sr-only">
            Loading your registrations
          </p>
          <Table aria-hidden="true">
            <RegistrationsTableHead />
            <TableBody>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className={CELL_CLASS}>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="mt-1.5 h-4 w-32" />
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <Skeleton className="h-5 w-20 rounded-4xl" />
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <Skeleton className="h-7 w-40" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load your events</AlertTitle>
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
      ) : data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Ticket aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>You haven&apos;t registered for any events yet.</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/events" />}>
              Browse events
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableCaption className="sr-only">Your event registrations</TableCaption>
            <RegistrationsTableHead />
            <TableBody>
              {data.map((registration) => (
                <RegistrationRow key={registration.id} registration={registration} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function RegistrationRow({ registration }: { registration: MyRegistration }) {
  const { event, status, certificate } = registration;

  return (
    <TableRow>
      <TableCell className={`${CELL_CLASS} max-w-sm min-w-48 whitespace-normal`}>
        <Link
          href={`/events/${event.id}`}
          className="font-medium wrap-break-word underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {event.title}
        </Link>
        <span className="block text-sm wrap-break-word text-muted-foreground">{event.location}</span>
      </TableCell>
      <TableCell className={CELL_CLASS}>{formatDateTime(event.startsAt)}</TableCell>
      <TableCell className={CELL_CLASS}>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {certificate ? (
          <div className="flex flex-col items-start gap-1">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={`/api/certificates/${certificate.id}`}
                  aria-label={`Download certificate for ${event.title}`}
                />
              }
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Download certificate
            </Button>
            <span className="text-sm text-muted-foreground">
              Issued {formatDate(certificate.issuedAt)}
            </span>
          </div>
        ) : status === "ATTENDED" ? (
          <span className="text-muted-foreground">Not issued yet</span>
        ) : (
          <>
            <span aria-hidden="true">-</span>
            <span className="sr-only">No certificate</span>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
