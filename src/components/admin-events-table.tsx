"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CalendarPlus, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableSkeleton } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table-features";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch, queryKeys, type AdminEvent, type AdminEventRow } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<DataTableFeatures, AdminEventRow>();

// Header labels for the loading skeleton, in column order (the last column is the row menu).
const SKELETON_HEADERS = ["Title", "Date", "Status", "Registrations", "Pending", ""];

const columns = columnHelper.columns([
  columnHelper.accessor("title", {
    header: "Title",
    cell: ({ row }) => (
      <div className="max-w-sm min-w-48 whitespace-normal">
        <Link
          href={`/admin/events/${row.original.id}/participants`}
          className="font-medium wrap-break-word underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {row.original.title}
        </Link>
        <span className="block text-sm wrap-break-word text-muted-foreground">
          {row.original.location}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("startsAt", {
    header: "Date",
    cell: ({ getValue }) => formatDateTime(getValue()),
  }),
  columnHelper.accessor("isPublished", {
    header: "Status",
    cell: ({ getValue }) =>
      getValue() ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>,
  }),
  columnHelper.display({
    id: "registrations",
    header: "Registrations",
    meta: { headClassName: "text-right", cellClassName: "text-right tabular-nums" },
    cell: ({ row }) =>
      row.original.capacity === null
        ? row.original.activeCount
        : `${row.original.activeCount} / ${row.original.capacity}`,
  }),
  columnHelper.accessor("pendingCount", {
    header: "Pending",
    meta: { headClassName: "text-right", cellClassName: "text-right tabular-nums" },
    cell: ({ getValue }) => (
      <span className={cn(getValue() === 0 && "text-muted-foreground")}>{getValue()}</span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    meta: { headClassName: "w-12", cellClassName: "text-right" },
    cell: ({ row }) => <RowActions event={row.original} />,
  }),
]);

function RowActions({ event }: { event: AdminEventRow }) {
  const queryClient = useQueryClient();

  const togglePublished = useMutation({
    mutationFn: () =>
      apiFetch<AdminEvent>(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !event.isPublished }),
      }),
    onSuccess: (updated) => {
      toast.success(updated.isPublished ? "Event published" : "Event unpublished");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["event"] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Actions for ${event.title}`} />}
      >
        {togglePublished.isPending ? <Spinner aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuItem render={<Link href={`/admin/events/${event.id}/edit`} />}>Edit</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/admin/events/${event.id}/participants`} />}>
          Participants
        </DropdownMenuItem>
        <DropdownMenuItem disabled={togglePublished.isPending} onClick={() => togglePublished.mutate()}>
          {event.isPublished ? "Unpublish" : "Publish"}
        </DropdownMenuItem>
        {event.isPublished && (
          <DropdownMenuItem render={<Link href={`/events/${event.id}`} />}>View public page</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminEventsTable() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.adminEvents(),
    queryFn: () => apiFetch<AdminEventRow[]>("/api/admin/events"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
        <Button nativeButton={false} render={<Link href="/admin/events/new" />}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          New event
        </Button>
      </div>

      {isPending ? (
        <DataTableSkeleton headers={SKELETON_HEADERS} label="Loading events" />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load events</AlertTitle>
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
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowId={(event) => event.id}
          caption="All events, newest first"
          empty={
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarPlus aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No events yet.</EmptyTitle>
                <EmptyDescription>Create an event to start taking registrations.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button nativeButton={false} render={<Link href="/admin/events/new" />}>
                  New event
                </Button>
              </EmptyContent>
            </Empty>
          }
        />
      )}
    </div>
  );
}
