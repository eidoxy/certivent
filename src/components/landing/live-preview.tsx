"use client";

import { useState } from "react";
import { CalendarDays, MapPin, RotateCcw, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegistrationStatus } from "@/lib/constants";

type Attendee = { id: string; name: string; status: RegistrationStatus };

// Illustrative sample data. State lives in this component only and is never sent anywhere.
const INITIAL: Attendee[] = [
  { id: "a1", name: "Bayu Wicaksono", status: "PENDING" },
  { id: "a2", name: "Nadia Putri", status: "PENDING" },
  { id: "a3", name: "Kevin Halim", status: "APPROVED" },
  { id: "a4", name: "Siti Rahma", status: "ATTENDED" },
];
const CAPACITY = 6;

// Mirrors the real admin transitions for these three states (feature 07): a pending
// registration cannot jump straight to attended.
const NEXT: Partial<Record<RegistrationStatus, { label: string; to: RegistrationStatus }>> = {
  PENDING: { label: "Approve", to: "APPROVED" },
  APPROVED: { label: "Mark attended", to: "ATTENDED" },
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

export function LivePreview() {
  const [attendees, setAttendees] = useState<Attendee[]>(INITIAL);
  const [announcement, setAnnouncement] = useState("");

  const pending = attendees.filter((a) => a.status === "PENDING").length;

  function advance(id: string) {
    const target = attendees.find((a) => a.id === id);
    const step = target ? NEXT[target.status] : undefined;
    if (!target || !step) return;
    setAttendees((rows) => rows.map((row) => (row.id === id ? { ...row, status: step.to } : row)));
    setAnnouncement(`${target.name} is now ${step.to.toLowerCase()}.`);
  }

  function reset() {
    setAttendees(INITIAL);
    setAnnouncement("Sample data reset.");
  }

  return (
    <section id="preview" aria-labelledby="preview-heading" className="flex scroll-mt-24 flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="preview-heading" className="text-3xl font-semibold tracking-tight text-balance">
          Try the registration flow
        </h2>
        <p className="max-w-[60ch] leading-relaxed text-muted-foreground">
          Approve a sign-up, then mark it attended. This is sample data, so nothing is saved.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="gap-3">
            <Badge variant="outline" className="w-fit">
              Sample event
            </Badge>
            <CardTitle role="heading" aria-level={3} className="text-xl font-semibold">
              Saturday Pottery Workshop
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              A hands-on class for beginners. Clay and tools are provided.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
                Sat 18 Oct, 10:00
              </li>
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
                Community Hall, Room 2
              </li>
              <li className="flex items-center gap-2">
                <Users aria-hidden="true" className="size-4 text-muted-foreground" />
                {attendees.length} of {CAPACITY} spots taken
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle role="heading" aria-level={3} className="text-xl font-semibold">
                Attendees
              </CardTitle>
              <CardDescription>
                <span className="tabular-nums">{pending}</span> pending {pending === 1 ? "registration" : "registrations"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw aria-hidden="true" data-icon="inline-start" />
              Reset sample
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {attendees.map((attendee) => {
                const step = NEXT[attendee.status];
                return (
                  <li key={attendee.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar>
                      <AvatarFallback aria-hidden="true">{initials(attendee.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 font-medium">{attendee.name}</span>
                    <StatusBadge status={attendee.status} />
                    <div className="flex min-w-32 justify-end">
                      {step ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => advance(attendee.id)}
                          aria-label={`${step.label}: ${attendee.name}`}
                        >
                          {step.label}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Ready for certificate</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* Announces each change to screen readers; visually hidden. */}
            <p role="status" aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
