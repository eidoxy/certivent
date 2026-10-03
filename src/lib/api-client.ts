import type { RegistrationStatus } from "@/lib/constants";
import type { ClosedReason } from "@/lib/registration-rules";

// Single source of truth for ClosedReason is registration-rules.ts; re-exported here for API consumers.
export type { ClosedReason };

export type EventSummary = {
  id: string;
  title: string;
  location: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  capacity: number | null;
  registrationDeadline: string | null;
  activeCount: number;
  isFull: boolean;
  isOpen: boolean;
  closedReason: ClosedReason;
};

export type EventDetail = EventSummary & {
  description: string;
  myRegistration: { id: string; status: RegistrationStatus } | null;
};

export type MyRegistration = {
  id: string;
  status: RegistrationStatus;
  createdAt: string; // ISO
  event: { id: string; title: string; location: string; startsAt: string; endsAt: string };
  certificate: { id: string; fileName: string; issuedAt: string } | null;
};

export type AdminEventRow = {
  id: string;
  title: string;
  location: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  isPublished: boolean;
  capacity: number | null;
  activeCount: number;
  pendingCount: number;
};

export type AdminEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  capacity: number | null;
  registrationDeadline: string | null; // ISO
  isPublished: boolean;
  activeCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type AdminStats = {
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  pendingRegistrations: number;
  awaitingCertificate: number;
};

export type AdminRegistrationList = {
  event: { id: string; title: string; startsAt: string; capacity: number | null; activeCount: number };
  registrations: Array<{
    id: string;
    status: RegistrationStatus;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    user: { id: string; name: string; email: string };
    certificate: {
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      issuedAt: string; // ISO
    } | null;
  }>;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
};

/**
 * fetch(path, { credentials: "same-origin", ...init }). Adds "Content-Type: application/json" when
 * init.body is a string; never sets Content-Type for FormData. Returns json.data or throws ApiError.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { credentials: "same-origin", ...init, headers });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json as ErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "INTERNAL_ERROR",
      err?.message ?? "Something went wrong. Please try again.",
      err?.fieldErrors,
    );
  }
  return (json as { data: T }).data;
}

export const queryKeys = {
  events: (q: string) => ["events", { q }] as const,
  event: (id: string) => ["event", id] as const,
  myRegistrations: () => ["me", "registrations"] as const,
  adminStats: () => ["admin", "stats"] as const,
  adminEvents: () => ["admin", "events"] as const,
  adminEvent: (id: string) => ["admin", "event", id] as const,
  adminEventRegistrations: (id: string, status: string) =>
    ["admin", "event", id, "registrations", { status }] as const,
};
