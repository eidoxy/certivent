"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, Pencil, RefreshCw, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { CertificateUploadDialog } from "@/components/certificate-upload-dialog";
import { DataTable, DataTableSkeleton } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table-features";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  ApiError,
  apiFetch,
  queryKeys,
  type AdminRegistrationList,
} from "@/lib/api-client";
import { ADMIN_TRANSITIONS, REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/constants";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | RegistrationStatus;

type ParticipantRow = AdminRegistrationList["registrations"][number] & { eventId: string };

type StatusUpdateResult = { id: string; status: RegistrationStatus; updatedAt: string };

// Mirrors the labels used by StatusBadge.
const STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ATTENDED: "Attended",
  CANCELLED: "Cancelled",
};

const FILTER_ITEMS: Record<StatusFilter, string> = {
  ALL: "All",
  ...STATUS_LABELS,
};

const FILTER_OPTIONS: StatusFilter[] = ["ALL", ...REGISTRATION_STATUSES];

// Header labels for the loading skeleton, in column order.
const SKELETON_HEADERS = ["Name", "Email", "Registered", "Status", "Change status", "Certificate"];

const columnHelper = createColumnHelper<DataTableFeatures, ParticipantRow>();

const columns = columnHelper.columns([
  columnHelper.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="block max-w-56 min-w-32 font-medium wrap-break-word whitespace-normal">
        {row.original.user.name}
      </span>
    ),
  }),
  columnHelper.display({
    id: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="block max-w-64 min-w-40 wrap-break-word whitespace-normal text-muted-foreground">
        {row.original.user.email}
      </span>
    ),
  }),
  columnHelper.display({
    id: "registered",
    header: "Registered",
    meta: { cellClassName: "tabular-nums" },
    cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy HH:mm"),
  }),
  columnHelper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  columnHelper.display({
    id: "changeStatus",
    header: "Change status",
    cell: ({ row }) => <ChangeStatusCell row={row.original} />,
  }),
  columnHelper.display({
    id: "certificate",
    header: "Certificate",
    cell: ({ row }) =>
      row.original.status === "ATTENDED" ? <CertificateCell row={row.original} /> : "-",
  }),
]);

function CertificateCell({ row }: { row: ParticipantRow }) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const certificate = row.certificate;

  const removeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>(`/api/admin/registrations/${row.id}/certificate`, { method: "DELETE" }),
    onSuccess: () => toast.success("Certificate removed"),
    onError: (err) => toast.error(err.message),
    // Runs on success and on error, so a 404 (already removed elsewhere) also refreshes the row.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(row.eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() }),
      ]),
  });

  return (
    <div className="flex min-w-44 flex-col items-start gap-2">
      {certificate ? (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="block max-w-56 text-sm wrap-break-word whitespace-normal">
              {certificate.fileName}
            </span>
            <span className="text-xs text-muted-foreground">{formatFileSize(certificate.sizeBytes)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={`/api/certificates/${certificate.id}`}
                  aria-label={`Download certificate of ${row.user.name}`}
                />
              }
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
              disabled={removeMutation.isPending}
              aria-label={`Replace certificate of ${row.user.name}`}
            >
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmRemove(true)}
              disabled={removeMutation.isPending}
              aria-label={`Remove certificate of ${row.user.name}`}
            >
              <Trash2 aria-hidden="true" data-icon="inline-start" />
              Remove
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload aria-hidden="true" data-icon="inline-start" />
          Upload certificate
        </Button>
      )}

      <CertificateUploadDialog
        eventId={row.eventId}
        registrationId={row.id}
        participantName={row.user.name}
        hasCertificate={certificate !== null}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove certificate for {row.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is deleted and the participant can no longer download it. You can upload a new
              one afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate(undefined, { onSettled: () => setConfirmRemove(false) })}
            >
              {removeMutation.isPending && <Spinner data-icon="inline-start" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChangeStatusCell({ row }: { row: ParticipantRow }) {
  const queryClient = useQueryClient();
  const [confirmReject, setConfirmReject] = useState(false);

  const options = ADMIN_TRANSITIONS[row.status];
  const certificateLocked = row.status === "ATTENDED" && row.certificate !== null;
  const hintId = `change-status-hint-${row.id}`;

  const mutation = useMutation({
    mutationFn: (status: RegistrationStatus) =>
      apiFetch<StatusUpdateResult>(`/api/admin/registrations/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_result, status) => toast.success(`Status updated to ${STATUS_LABELS[status]}`),
    onError: (err) => toast.error(err.message),
    // Runs on success and on error. Returning the promise keeps the row locked until the list has refreshed.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(row.eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminEvents() }),
      ]),
  });

  function handleChange(next: RegistrationStatus | null) {
    if (next === null) return;
    if (next === "REJECTED") {
      setConfirmReject(true);
      return;
    }
    mutation.mutate(next);
  }

  return (
    <div className="flex min-w-40 flex-col gap-1">
      <div className="flex items-center gap-2">
        <Select<RegistrationStatus>
          value={null}
          onValueChange={handleChange}
          disabled={options.length === 0 || certificateLocked || mutation.isPending}
        >
          <SelectTrigger
            size="sm"
            className="w-36"
            aria-label={`Change status for ${row.user.name}`}
            aria-describedby={certificateLocked ? hintId : undefined}
          >
            <SelectValue placeholder={options.length === 0 ? "-" : "Change…"} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {options.map((status) => (
              <SelectItem
                key={status}
                value={status}
                className={cn(status === "REJECTED" && "text-destructive focus:text-destructive")}
              >
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mutation.isPending && <Spinner aria-label="Updating status" />}
      </div>
      {certificateLocked && (
        <span id={hintId} className="text-xs text-muted-foreground">
          Remove certificate first
        </span>
      )}

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {row.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their registration will no longer count toward the event capacity. You can move it back
              to Pending or Approved later if there is room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate("REJECTED", { onSettled: () => setConfirmReject(false) })
              }
            >
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ParticipantsTable({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useQuery({
    queryKey: queryKeys.adminEventRegistrations(eventId, status),
    queryFn: () =>
      apiFetch<AdminRegistrationList>(`/api/admin/events/${eventId}/registrations?status=${status}`),
    // Keep the header and rows on screen while a new filter loads.
    placeholderData: keepPreviousData,
  });

  const rows = useMemo<ParticipantRow[]>(
    () => data?.registrations.map((registration) => ({ ...registration, eventId })) ?? [],
    [data, eventId],
  );

  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">Participants</h1>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Event not found</EmptyTitle>
            <EmptyDescription>It may have been removed, or the link is wrong.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/admin/events" />}>
              Back to events
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const event = data?.event;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight wrap-break-word">
            {event ? `Participants - ${event.title}` : "Participants"}
          </h1>
          {event ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{formatDateTime(event.startsAt)}</span>
              <span>
                {event.capacity === null
                  ? `${event.activeCount} active`
                  : `${event.activeCount} / ${event.capacity} active`}
              </span>
            </div>
          ) : (
            <Skeleton className="h-5 w-64" />
          )}
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/admin/events/${eventId}/edit`} />}
        >
          <Pencil aria-hidden="true" data-icon="inline-start" />
          Edit event
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="participant-status-filter">Filter by status</Label>
        <Select<StatusFilter>
          value={status}
          onValueChange={(next) => {
            if (next !== null) setStatus(next);
          }}
          items={FILTER_ITEMS}
        >
          <SelectTrigger id="participant-status-filter" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {FILTER_ITEMS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load participants</AlertTitle>
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
      ) : isPending ? (
        <DataTableSkeleton headers={SKELETON_HEADERS} label="Loading participants" />
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
        >
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            caption={`Participants of ${event?.title ?? "this event"}`}
            empty={
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {status === "ALL" ? "No registrations." : "No registrations for this status."}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            }
          />
        </div>
      )}
    </div>
  );
}
