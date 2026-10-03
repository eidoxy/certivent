# 04 — Event registration (register / cancel)

Depends on: 00–03. Stories: P-05, P-06. Business rules: PRD §6.1–6.5.

## 1. API

Both endpoints live in `src/app/api/events/[id]/register/route.ts`. Guard: `requireParticipant()` (admins get 403).

### `POST /api/events/:id/register`

No body. All steps inside **one interactive transaction** so concurrent requests cannot exceed capacity:

```ts
const registration = await prisma.$transaction(async (tx) => {
  // 1. Lock the event row; concurrent registrations for the same event queue here.
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
  if (locked.length === 0) throw new HttpError(404, "NOT_FOUND", "Event not found");

  // 2. Load event + active count (01 §5 include).
  const event = await tx.event.findUniqueOrThrow({ where: { id }, include: { _count: /* active */ } });

  // 3. Existing registration for this user.
  const existing = await tx.registration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: id } },
  });
  if (existing && existing.status !== "CANCELLED") {
    throw new HttpError(409, "ALREADY_REGISTERED", "You already have a registration for this event");
  }

  // 4. Window + capacity.
  const state = registrationState(event, event._count.registrations);
  if (state.closedReason === "UNPUBLISHED") throw new HttpError(404, "NOT_FOUND", "Event not found");
  if (state.closedReason === "FULL") throw new HttpError(409, "EVENT_FULL", "This event is full");
  if (state.closedReason) throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this event is closed");

  // 5. Reactivate or create.
  return existing
    ? tx.registration.update({ where: { id: existing.id }, data: { status: "PENDING" } })
    : tx.registration.create({ data: { userId: user.id, eventId: id } });
}, { timeout: 10_000 });
```

- A `P2002` unique violation (double-click race) → 409 `ALREADY_REGISTERED`.
- `REJECTED` counts as "existing" → 409 `ALREADY_REGISTERED` (rejected participants cannot re-apply).
- Response 201 `{ data: { id, eventId, status, createdAt, updatedAt } }` (ISO dates).

### `DELETE /api/events/:id/register` — cancel own registration

1. Load `registration.findUnique({ where: { userId_eventId: { userId: user.id, eventId: id } }, include: { event: { select: { startsAt: true } } } })`. None → 404 `NOT_FOUND` "Registration not found".
2. Status not in `PENDING`, `APPROVED` → 409 `INVALID_TRANSITION` "This registration can no longer be cancelled".
3. `now >= event.startsAt` → 409 `REGISTRATION_CLOSED` "The event has already started".
4. Update `status: "CANCELLED"`. Response 200 `{ data: { id, eventId, status, createdAt, updatedAt } }`.

No transaction needed (cancelling only frees capacity).

## 2. Client

Mutations live in `EventDetailView` (module 03):

```ts
const register = useMutation({
  mutationFn: () => apiFetch(`/api/events/${id}/register`, { method: "POST" }),
  onSuccess: () => { toast.success("You're registered. Awaiting approval."); invalidate(); },
  onError: (e: ApiError) => { toast.error(e.message); invalidate(); },
});
const cancel = useMutation({
  mutationFn: () => apiFetch(`/api/events/${id}/register`, { method: "DELETE" }),
  onSuccess: () => { toast.success("Registration cancelled."); invalidate(); },
  onError: (e: ApiError) => toast.error(e.message),
});
// invalidate(): queryKeys.event(id), ["events"], queryKeys.myRegistrations()
```

- Register button: shows `Spinner` + disabled while pending. Errors refetch the event so the panel reflects the real state (e.g. now full).
- Cancel button opens an `AlertDialog`: title "Cancel registration?", description "You can register again later if spots are still available.", actions "Keep registration" / "Cancel registration" (destructive).

## 3. Acceptance

- [ ] First registration → 201, status `PENDING`, panel shows the badge.
- [ ] Second POST → 409 `ALREADY_REGISTERED`.
- [ ] Capacity-2 event: third participant → 409 `EVENT_FULL`; two parallel requests for the last spot produce exactly one 201.
- [ ] After deadline / start → 409 `REGISTRATION_CLOSED`.
- [ ] Cancel `PENDING` → `CANCELLED`; registering again reuses the same row (same `id`) with `PENDING`.
- [ ] Admin session → 403 on both endpoints; guest → 401.
