# 03 — Browse events (public)

Depends on: 00, 01, 02. Stories: P-03, P-04.

## 1. Shared response types (define in `src/lib/api-client.ts`, export for reuse)

```ts
export type ClosedReason = "UNPUBLISHED" | "STARTED" | "DEADLINE_PASSED" | "FULL" | null;

export type EventSummary = {
  id: string;
  title: string;
  location: string;
  startsAt: string;              // ISO
  endsAt: string;                // ISO
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
```

Server mapping: create `src/lib/serializers.ts` (server only) with `toEventSummary(event, activeCount)` that builds this object using `registrationState()` and `.toISOString()` for dates. Use it in every endpoint that returns `EventSummary`.

## 2. API

### `GET /api/events?q=` — public

- Query: `z.object({ q: z.string().trim().max(100).optional() })` parsed from `new URL(req.url).searchParams`.
- Where: `isPublished: true`, `endsAt: { gte: now }`; if `q` non-empty: `OR: [{ title: { contains: q, mode: "insensitive" } }, { location: { contains: q, mode: "insensitive" } }]`.
- Order `startsAt: "asc"`, `take: 100`, include the active `_count` (01 §5).
- Response 200 `{ data: EventSummary[] }`.

### `GET /api/events/:id` — public

- `findUnique({ where: { id }, include: active _count })`. Missing or `isPublished === false` → 404 `NOT_FOUND` "Event not found" (also for admins — they use the admin API).
- `myRegistration`: if `getSessionUser()` is a `PARTICIPANT`, look up `registration.findUnique({ where: { userId_eventId: { userId, eventId: id } }, select: { id: true, status: true } })`; otherwise `null`.
- Response 200 `{ data: EventDetail }`.

## 3. Pages

### `/events` — `src/app/events/page.tsx`
Server page (no guard) renders `<EventList />` (client).

`EventList`:
- `<h1>Upcoming events</h1>`, a search `Input` with label "Search events" (visually hidden label is fine via `sr-only`), placeholder "Search by title or location".
- Debounce input 300 ms (`useEffect` + `setTimeout`) into `q`; `useQuery({ queryKey: queryKeys.events(q), queryFn: () => apiFetch<EventSummary[]>(`/api/events?q=${encodeURIComponent(q)}`) })`.
- Grid of `EventCard` (1 col mobile, 2 cols `md`). States per 00 §8; empty text: "No upcoming events match your search." / "No upcoming events yet.".

`EventCard` (`src/components/event-card.tsx`), a shadcn `Card` that is a link to `/events/{id}`:
- Title (`CardTitle`), date line `format(startsAt, "EEE, d MMM yyyy · HH:mm")`, location.
- Capacity line: `capacity === null` → "{activeCount} registered"; else "{activeCount} / {capacity} registered".
- Badge: `isOpen` → "Open" (`default`); `closedReason === "FULL"` → "Full" (`destructive`); otherwise "Closed" (`secondary`).

### `/events/[id]` — `src/app/events/[id]/page.tsx`
Server page: `const { id } = await props.params` (`PageProps<"/events/[id]">`), `const user = await getSessionUser()`, render `<EventDetailView id={id} viewerRole={user?.role ?? null} />`.

`EventDetailView` (client): `useQuery({ queryKey: queryKeys.event(id), queryFn: () => apiFetch<EventDetail>(`/api/events/${id}`) })`.
- 404 (`ApiError.status === 404`) → "Event not found" with link back to `/events`.
- Layout: `<h1>{title}</h1>`; definition list: Date & time (`startsAt`–`endsAt`, same day → "Sat, 11 Oct 2026 · 09:00–12:00", else both full), Location, Capacity ("Unlimited" or "{activeCount} / {capacity}"), Registration closes (deadline or startsAt, formatted); description rendered as plain text with `whitespace-pre-line` (no HTML/markdown rendering).
- Action panel (`Card`), by viewer:

| Viewer / state | Render |
|---|---|
| Guest | Button "Log in to register" → `/login?callbackUrl=/events/{id}` |
| Admin | Text "Administrators cannot register for events." + link "Manage participants" → `/admin/events/{id}/participants` |
| Participant, `myRegistration` null or `CANCELLED`, `isOpen` | Button "Register" (module 04 mutation) |
| Participant, not registered, closed | Disabled button "Registration closed" + reason text (below) |
| Participant, `PENDING` / `APPROVED` | `StatusBadge` + text + "Cancel registration" (module 04) when `now < startsAt` |
| Participant, `ATTENDED` | `StatusBadge` + link "Go to My events" → `/my-events` |
| Participant, `REJECTED` | `StatusBadge` + "Your registration was not accepted." |

Status helper texts: PENDING "Your registration is awaiting approval."; APPROVED "You're confirmed for this event."; CANCELLED (shown above Register button) "You cancelled this registration. You can register again."

Closed reason texts: `FULL` "This event is full."; `DEADLINE_PASSED` "The registration deadline has passed."; `STARTED` "This event has already started."; `UNPUBLISHED` never reaches the client (404).

## 4. Acceptance

- [ ] Guest sees only published, not-yet-ended events, ordered by start time.
- [ ] Search matches title or location, case-insensitive.
- [ ] Unpublished event URL → "Event not found" for everyone.
- [ ] Action panel matches the table for each viewer/state.
- [ ] Capacity-2 seed event shows "Full" after two registrations.
