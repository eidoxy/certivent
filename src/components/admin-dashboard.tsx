"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch, queryKeys, type AdminStats } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type StatDef = {
  key: keyof AdminStats;
  label: string;
  /** Column span on the 6-column desktop grid: the work queue cards are wider. */
  className: string;
};

const STATS: StatDef[] = [
  { key: "totalEvents", label: "Total events", className: "lg:col-span-2" },
  { key: "publishedEvents", label: "Published", className: "lg:col-span-2" },
  { key: "upcomingEvents", label: "Upcoming", className: "lg:col-span-2" },
  { key: "pendingRegistrations", label: "Pending registrations", className: "lg:col-span-3" },
  { key: "awaitingCertificate", label: "Awaiting certificate", className: "lg:col-span-3" },
];

export function AdminDashboard() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.adminStats(),
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/events" />}>
            Manage events
          </Button>
          <Button nativeButton={false} render={<Link href="/admin/events/new" />}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            New event
          </Button>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the dashboard</AlertTitle>
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
        <section aria-label="Overview" aria-busy={isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {isPending && (
            <p role="status" className="sr-only">
              Loading dashboard
            </p>
          )}
          {STATS.map(({ key, label, className }) => (
            <Card key={key} className={cn(className)}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                {isPending ? (
                  <Skeleton aria-hidden="true" className="mt-1 h-9 w-16" />
                ) : (
                  <CardTitle className="text-3xl font-semibold tabular-nums">{data[key]}</CardTitle>
                )}
              </CardHeader>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
