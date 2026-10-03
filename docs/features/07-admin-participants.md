# 07 — Admin: participants & status changes

Depends on: 00–06. Stories: A-04, A-05. Certificate actions in the same table are specified in 08.

## 1. Transition table (authoritative; put in `ADMIN_TRANSITIONS` in `src/lib/constants.ts`)

| From | Admin may set |
|---|---|
| `PENDING` | `APPROVED`, `REJECTED` |
| `APPROVED` | `ATTENDED`, `REJECTED`, `PENDING` |
| `REJECTED` | `PENDING`, `APPROVED` |
| `ATTENDED` | `APPROVED` (only if no certificate) |
| `CANCELLED` | — (participant-only state) |

Admins can never set `CANCELLED`. Setting the current status is a no-op (200, unchanged).

## 2. Validation (`src/lib/validations/registration.ts`)

```ts
export const statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ATTENDED"]),
});
export const registrationFilterSchema = z.object({
  status: z.enum(["ALL", "PENDING", "APPROVED", "REJECTED", "ATTENDED", "CANCELLED"]).default("ALL"),
});
```

## 3. API — `requireAdmin()` first

### `GET /api/admin/events/:id/registrations?status=ALL`

1. Parse `status` with `registrationFilterSchema` (invalid → 400).
2. Event with active `_count`; missing → 404.
3. ```ts
   registration.findMany({
     where: { eventId: id, ...(status === "ALL" ? {} : { status }) },
     orderBy: { createdAt: "asc" },
     select: {
       id: true, status: true, createdAt: true, updatedAt: true,
       user: { select: { id: true, name: true, email: true } },
       certificate: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, issuedAt: true } },
     },
   })
   ```
4. Response:

```ts
export type AdminRegistrationList = {
  event: { id: string; title: string; startsAt: string; capacity: number | null; activeCount: number };
  registrations: Array<{
    id: string; status: RegistrationStatus; createdAt: string; updatedAt: string;
    user: { id: string; name: string; email: string };
    certificate: { id: string; fileName: string; mimeType: string; sizeBytes: number; issuedAt: string } | null;
  }>;
};
```

### `PATCH /api/admin/registrations/:id`

Body `statusUpdateSchema`. Run in a transaction:
1. Load registration with `certificate: { select: { id: true } }`; missing → 404.
2. `to === from` → return current (200).
3. `to` not in `ADMIN_TRANSITIONS[from]` → 409 `INVALID_TRANSITION` "Cannot change status from {from} to {to}".
4. `from === "ATTENDED"` and certificate exists → 409 `CERTIFICATE_EXISTS` "Remove the certificate before changing this status".
5. If `from` is inactive (`REJECTED`) and `to` is active (`PENDING`/`APPROVED`): lock the event row (`SELECT … FOR UPDATE`, as in 04), recount active registrations; `capacity !== null && activeCount >= capacity` → 409 `EVENT_FULL`. Deadlines do not apply to admins.
6. Update status. Response 200 `{ data: { id, status, updatedAt } }`.

## 4. Page `/admin/events/[id]/participants`

Server page: `const { id } = await props.params`; render `<ParticipantsTable eventId={id} />` (`src/components/participants-table.tsx`, client).

- Data: `useQuery({ queryKey: queryKeys.adminEventRegistrations(id, status), queryFn: … })`, `status` from a filter `Select` (label "Filter by status", options All + five statuses). 404 → "Event not found".
- Header: `<h1>Participants — {event.title}</h1>`, sub-line: date, "{activeCount} active" or "{activeCount} / {capacity} active"; link "Edit event".
- Columns: Name, Email, Registered (`d MMM yyyy HH:mm`), Status (`StatusBadge`), Change status, Certificate.
- **Change status** cell: a `Select` (`aria-label="Change status for {name}"`, placeholder "Change…") whose options are `ADMIN_TRANSITIONS[current]`; disabled with text "—" when the list is empty, and disabled when `current === "ATTENDED"` and a certificate exists (tooltip-free hint text "Remove certificate first"). Choosing an option fires the mutation immediately (no confirm), except `REJECTED`, which first opens an `AlertDialog` "Reject {name}?".
- Mutation: `PATCH /api/admin/registrations/{registrationId}` `{ status }`; success toast "Status updated to {Label}"; invalidate `["admin", "event", id]`, `queryKeys.adminStats()`, `queryKeys.adminEvents()`; error → `toast.error(message)` and invalidate the same keys.
- **Certificate** cell: only for `ATTENDED` rows — see 08 §4. Other rows show "—".
- Empty state: "No registrations{ for this status}."

## 5. Acceptance

- [ ] Only allowed transitions are offered; a forged PATCH with a disallowed one → 409 `INVALID_TRANSITION`.
- [ ] Re-activating a rejected registration on a full event → 409 `EVENT_FULL`.
- [ ] `ATTENDED` with certificate cannot be changed until the certificate is removed.
- [ ] Filter by status works; counts in header and dashboard refresh after changes.
