# 06 — Admin dashboard & event management

Depends on: 00–03. Stories: A-01, A-02, A-03.

## 1. Validation (`src/lib/validations/event.ts`)

```ts
import { z } from "zod";

const isoDate = z.iso.datetime({ offset: true });

const eventBase = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  location: z.string().trim().min(2, "Location is required").max(200),
  startsAt: isoDate,
  endsAt: isoDate,
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(100000).nullable(),
  registrationDeadline: isoDate.nullable(),
  isPublished: z.boolean(),
});

function checkDates(v: { startsAt: string; endsAt: string; registrationDeadline: string | null }, ctx: z.RefinementCtx) {
  if (new Date(v.endsAt) <= new Date(v.startsAt))
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after the start" });
  if (v.registrationDeadline && new Date(v.registrationDeadline) > new Date(v.startsAt))
    ctx.addIssue({ code: "custom", path: ["registrationDeadline"], message: "Deadline must be on or before the start" });
}

export const eventInputSchema = eventBase.superRefine(checkDates);   // POST, and merged PATCH
export const eventUpdateSchema = eventBase.partial();                // PATCH body
export type EventInput = z.output<typeof eventInputSchema>;

// Form schema: raw string values from inputs.
export const eventFormSchema = z.object({
  title: eventBase.shape.title,
  description: eventBase.shape.description,
  location: eventBase.shape.location,
  startsAt: z.string().min(1, "Start is required"),             // datetime-local "yyyy-MM-ddTHH:mm"
  endsAt: z.string().min(1, "End is required"),
  registrationDeadline: z.string(),                              // "" = none
  capacity: z.string().regex(/^\d*$/, "Whole number only"),      // "" = unlimited
  isPublished: z.boolean(),
});
export type EventFormValues = z.output<typeof eventFormSchema>;

export function formToEventInput(v: EventFormValues): EventInput; // datetime-local → ISO; "" → null; capacity → Number
export function eventToFormValues(e: AdminEvent): EventFormValues; // ISO → "yyyy-MM-dd'T'HH:mm"; null → ""
```

Server errors come back keyed by the same field names, so `setError` works directly. Past dates are allowed.

## 2. Response types

```ts
export type AdminEventRow = {
  id: string; title: string; location: string; startsAt: string; endsAt: string;
  isPublished: boolean; capacity: number | null; activeCount: number; pendingCount: number;
};
export type AdminEvent = {
  id: string; title: string; description: string; location: string;
  startsAt: string; endsAt: string; capacity: number | null; registrationDeadline: string | null;
  isPublished: boolean; activeCount: number; createdAt: string; updatedAt: string;
};
export type AdminStats = {
  totalEvents: number; publishedEvents: number; upcomingEvents: number;
  pendingRegistrations: number; awaitingCertificate: number;
};
```

## 3. API — every handler starts with `requireAdmin()`

### `GET /api/admin/stats`
Run in `Promise.all`:
- `totalEvents`: `event.count()`
- `publishedEvents`: `event.count({ where: { isPublished: true } })`
- `upcomingEvents`: `event.count({ where: { startsAt: { gte: now } } })`
- `pendingRegistrations`: `registration.count({ where: { status: "PENDING" } })`
- `awaitingCertificate`: `registration.count({ where: { status: "ATTENDED", certificate: { is: null } } })`

Response `{ data: AdminStats }`.

### `GET /api/admin/events`
1. `event.findMany({ orderBy: { startsAt: "desc" }, take: 100 })` (all, including drafts).
2. `registration.groupBy({ by: ["eventId", "status"], _count: { _all: true } })`, then per event: `activeCount` = sum of PENDING+APPROVED+ATTENDED, `pendingCount` = PENDING.
3. Response `{ data: AdminEventRow[] }`.

### `POST /api/admin/events`
`parseJson(req, eventInputSchema)` → `event.create({ data: { ...input, startsAt: new Date(...), endsAt: new Date(...), registrationDeadline: input.registrationDeadline ? new Date(...) : null, createdById: admin.id } })` → 201 `{ data: AdminEvent }` (`activeCount: 0`).

### `GET /api/admin/events/:id`
`findUnique` with active `_count`; missing → 404. Response `{ data: AdminEvent }`.

### `PATCH /api/admin/events/:id`
1. `patch = await parseJson(req, eventUpdateSchema)`.
2. Load existing (with active `_count`); missing → 404.
3. `merged = { ...existingAsInput, ...patch }` where `existingAsInput` uses ISO strings for dates.
4. `eventInputSchema.safeParse(merged)`; failure → 400 `VALIDATION_ERROR` with `fieldErrors`.
5. If `merged.capacity !== null && merged.capacity < activeCount` → 409 `CAPACITY_BELOW_ACTIVE` "Capacity cannot be lower than the {activeCount} active registrations" with `fieldErrors: { capacity: [same message] }`.
6. Update with Date conversions. Response 200 `{ data: AdminEvent }`.

The publish toggle sends `{ isPublished: boolean }` only; the edit form sends all fields. There is no DELETE.

## 4. Pages (all under `src/app/admin/`)

### `admin/layout.tsx`
`await requireAdminPage()`; render a secondary nav ("Dashboard" `/admin`, "Events" `/admin/events`) above `{children}`. Mark the active link with `aria-current="page"` (client sub-component using `usePathname`).

### `/admin` — dashboard
`<h1>Admin dashboard</h1>`; five stat `Card`s from `useQuery(queryKeys.adminStats())`: Total events, Published, Upcoming, Pending registrations, Awaiting certificate. Buttons: "New event" → `/admin/events/new`, "Manage events" → `/admin/events`.

### `/admin/events` — table
`<h1>Events</h1>` + "New event" button. `Table` columns: Title (link to participants page), Date, Status (`Badge` "Published" default / "Draft" secondary), Registrations ("{activeCount}" or "{activeCount} / {capacity}"), Pending, Actions (`DropdownMenu` with `aria-label="Actions for {title}"`):
- "Edit" → `/admin/events/{id}/edit`
- "Participants" → `/admin/events/{id}/participants`
- "Publish" / "Unpublish" → `PATCH { isPublished: !isPublished }`, toast, invalidate `["admin"]` and `["events"]`
- "View public page" (only when published) → `/events/{id}`

### `/admin/events/new` and `/admin/events/[id]/edit`
Both render `<EventForm mode="create" />` / `<EventForm mode="edit" eventId={id} />` (`src/components/event-form.tsx`).
- Edit mode loads `queryKeys.adminEvent(id)`, shows `Skeleton` until loaded, then `form.reset(eventToFormValues(data))`.
- Fields (in order): Title `Input`; Description `Textarea` (rows 6); Location `Input`; Starts at / Ends at `Input type="datetime-local"`; Registration deadline `Input type="datetime-local"` with description "Optional. Defaults to the event start."; Capacity `Input type="number" min=1 inputMode="numeric"` with description "Leave empty for unlimited."; Published `Switch` with description "Draft events are hidden from participants.".
- Submit: create → `POST /api/admin/events`; edit → `PATCH /api/admin/events/{id}` with the full `formToEventInput(values)`. On success: toast "Event created" / "Event saved", invalidate `["admin"]` and `["events"]`, `router.push("/admin/events")`. On `ApiError` with `fieldErrors` → `setError` per field; other errors → toast.
- Buttons: "Create event" / "Save changes" (with pending spinner) and "Cancel" → `/admin/events`.

## 5. Acceptance

- [ ] Participant/guest calling any `/api/admin/*` → 403/401.
- [ ] Create a draft → visible in admin table, invisible on `/events`; publish → visible on `/events`.
- [ ] End before start → field error on "Ends at"; deadline after start → field error on deadline.
- [ ] Lowering capacity below active registrations → field error on Capacity.
- [ ] Dashboard counts update after registrations and status changes.
