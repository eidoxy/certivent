# 05 — My events (participant)

Depends on: 00–04, and 08 for the download endpoint. Stories: P-07, P-08.

## 1. API

### `GET /api/me/registrations` — `requireParticipant()`

```ts
prisma.registration.findMany({
  where: { userId: user.id },
  orderBy: { event: { startsAt: "desc" } },
  select: {
    id: true, status: true, createdAt: true,
    event: { select: { id: true, title: true, location: true, startsAt: true, endsAt: true } },
    certificate: { select: { id: true, fileName: true, issuedAt: true } },
  },
});
```

Response 200 `{ data: MyRegistration[] }` (all statuses, including `CANCELLED`):

```ts
export type MyRegistration = {
  id: string;
  status: RegistrationStatus;
  createdAt: string;
  event: { id: string; title: string; location: string; startsAt: string; endsAt: string };
  certificate: { id: string; fileName: string; issuedAt: string } | null;
};
```

Registrations for events that were later unpublished are still listed. Always link the title; the public page then shows "Event not found". Do not add extra fields for this.

## 2. Page `/my-events` — `src/app/my-events/page.tsx`

- Server: `await requireParticipantPage("/my-events")`, render `<MyRegistrations />`.
- Client: `useQuery({ queryKey: queryKeys.myRegistrations(), queryFn: () => apiFetch<MyRegistration[]>("/api/me/registrations") })`.
- `<h1>My events</h1>`; shadcn `Table` with caption "Your event registrations". Columns:

| Column | Content |
|---|---|
| Event | Link to `/events/{event.id}` with title; location below in muted text |
| Date | `format(startsAt, "d MMM yyyy · HH:mm")` |
| Status | `StatusBadge` |
| Certificate | see rules below |

Certificate cell:
- `certificate` present → `<Button asChild size="sm"><a href={`/api/certificates/${certificate.id}`}>Download certificate</a></Button>` plus muted "Issued {format(issuedAt, "d MMM yyyy")}". A plain link (not `fetch`) so the browser follows the 302 to the signed URL and downloads.
- `status === "ATTENDED"` and no certificate → muted "Not issued yet".
- Otherwise → "—".

- Empty state: "You haven't registered for any events yet." + button "Browse events" → `/events`.
- On small screens the table may scroll horizontally (`overflow-x-auto` wrapper); no separate mobile layout.

## 3. Acceptance

- [ ] Lists every registration of the logged-in participant, newest event first, with correct badges.
- [ ] Issued certificate downloads with its original file name.
- [ ] Admin opening `/my-events` is redirected to `/admin`; API returns 403 for admins, 401 for guests.
