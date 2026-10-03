"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch, queryKeys, type EventSummary } from "@/lib/api-client";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_COUNT = 4;

export function EventList() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQ(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.events(q),
    queryFn: () => apiFetch<EventSummary[]>(`/api/events?q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Upcoming events</h1>
        <div className="flex w-full flex-col gap-2 md:max-w-sm">
          <Label htmlFor="event-search" className="sr-only">
            Search events
          </Label>
          <Input
            id="event-search"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="Search by title or location"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
      </div>

      {isPending ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2">
          <p role="status" className="sr-only">
            Loading events
          </p>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
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
      ) : data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{q ? "No upcoming events match your search." : "No upcoming events yet."}</EmptyTitle>
          </EmptyHeader>
          {q && (
            <EmptyContent>
              <Button variant="outline" onClick={() => setInput("")}>
                Clear search
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
