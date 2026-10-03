# 00 — Conventions (read before any module)

Every feature module assumes these rules. If a module and this file disagree, this file wins unless the module says "overrides 00".

## 1. Ground rules for the coding agent

1. **Next.js 16.3.8 is newer than most training data.** Before writing Next-specific code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). Key facts already verified:
   - Middleware is named **`src/proxy.ts`** and exports `proxy` (or default). `middleware.ts` is deprecated.
   - `params` and `searchParams` are **Promises** in pages, layouts and Route Handlers: `const { id } = await ctx.params`.
   - Global type helpers exist: `PageProps<'/events/[id]'>`, `LayoutProps<'/'>`, `RouteContext<'/api/events/[id]'>`. Use them instead of hand-written prop types.
   - `next lint` no longer exists; lint with `bun run lint` (`eslint`).
2. **Package manager is Bun 1.4.2** (`bun.lock`, `packageManager` field). Use `bun add -E <pkg>@<version>`, `bunx <cli>`. Never run `npm install` (creates a second lockfile).
3. **Prisma is 7.10.0**, not 6. No `url` in `schema.prisma`; generator `prisma-client` with required `output`; a driver adapter (`@prisma/adapter-pg`) is mandatory; CLI config lives in `prisma.config.ts`; `migrate dev` does not run `generate` or seed. Import the client from `@/generated/prisma/client`, never from `@prisma/client`.
4. **Auth.js is v5 beta** (`next-auth@5.0.0-beta.32`). Use v5 APIs only: `NextAuth()` returns `{ handlers, auth, signIn, signOut }`; server code calls `auth()`. Do not use v4 APIs (`getServerSession`, `authOptions`, `NextAuthOptions`).
5. **Zod 4**: use `z.email()`, `z.iso.datetime({ offset: true })`, `z.flattenError(err)`. Do not use deprecated `.email()` on strings or `err.flatten()`.
6. Do not add packages beyond `docs/PRD.md` §8 without asking. Do not add tests, i18n, Storybook, or OpenAPI.
7. Do not invent endpoints, fields, statuses or error codes. Everything allowed is listed in these docs.

## 2. Folder structure (authoritative)

```
certivent/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  prisma.config.ts
  src/
    generated/prisma/          # Prisma output — gitignored, never edited
    app/
      layout.tsx               # <Providers>, <SiteHeader>, <Toaster>
      page.tsx                 # landing (role-aware redirect)
      (auth)/login/page.tsx
      (auth)/register/page.tsx
      events/page.tsx
      events/[id]/page.tsx
      my-events/page.tsx
      admin/layout.tsx         # server guard: requireAdminPage()
      admin/page.tsx
      admin/events/page.tsx
      admin/events/new/page.tsx
      admin/events/[id]/edit/page.tsx
      admin/events/[id]/participants/page.tsx
      api/auth/[...nextauth]/route.ts
      api/register/route.ts
      api/events/route.ts
      api/events/[id]/route.ts
      api/events/[id]/register/route.ts
      api/me/registrations/route.ts
      api/certificates/[id]/route.ts
      api/admin/stats/route.ts
      api/admin/events/route.ts
      api/admin/events/[id]/route.ts
      api/admin/events/[id]/registrations/route.ts
      api/admin/registrations/[id]/route.ts
      api/admin/registrations/[id]/certificate/route.ts
    components/
      ui/                      # shadcn generated — do not hand-edit except via CLI
      providers.tsx
      site-header.tsx
      status-badge.tsx
      event-card.tsx
      event-form.tsx
      participants-table.tsx
      certificate-upload-dialog.tsx
    lib/
      db.ts                    # Prisma singleton (server only)
      auth.ts                  # Auth.js config (server only)
      authz.ts                 # requireUser / requireAdmin / requireParticipant + page variants
      http.ts                  # HttpError, ok(), fail(), route() wrapper, parseJson()
      storage.ts               # Supabase Storage wrapper (server only)
      env.ts                   # Zod-validated server env (server only)
      constants.ts             # status lists, transitions, file limits (client-safe)
      registration-rules.ts    # pure functions: isRegistrationOpen, activeStatuses… (client-safe)
      serializers.ts           # Prisma rows → API response shapes (server only)
      api-client.ts            # apiFetch + queryKeys (client-safe)
      utils.ts                 # shadcn cn()
      validations/auth.ts
      validations/event.ts
      validations/registration.ts
    types/next-auth.d.ts
    proxy.ts
  docs/
```

**Server-only files** (`db.ts`, `auth.ts` except its exported client-safe types, `storage.ts`, `env.ts`, `authz.ts`, `http.ts`) must never be imported from a file that starts with `"use client"`. Client components get data only through `api-client.ts`.

## 3. Page pattern

- Pages are **Server Components** that do access control (`await auth()` / page guards in `authz.ts`) and render one Client Component that owns data fetching via TanStack Query.
- Client Components never call Prisma; they call REST endpoints through `apiFetch`.
- Forms: react-hook-form + `zodResolver` + shadcn `Field` components with `Controller` (pattern below).

```tsx
<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
      <Input {...field} id={field.name} type="email" aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

When the server returns `VALIDATION_ERROR`, map `fieldErrors` onto the form with `form.setError(name, { message })`.

## 4. REST API contract

### Envelope
- Success: `{ "data": <payload> }` with status 200 (read/update) or 201 (create).
- Error: `{ "error": { "code": string, "message": string, "fieldErrors"?: Record<string, string[]> } }`.
- Dates are serialized as ISO 8601 UTC strings (default `JSON.stringify` of `Date`).
- Request bodies are JSON (`Content-Type: application/json`) except certificate upload (`multipart/form-data`).

### Error codes (closed list)

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod parse failed or body is not valid JSON; include `fieldErrors` |
| 400 | `INVALID_FILE` | Missing file, wrong type, wrong magic bytes, empty or > 4 MB |
| 401 | `UNAUTHENTICATED` | No session |
| 403 | `FORBIDDEN` | Wrong role or not the owner |
| 404 | `NOT_FOUND` | Resource missing, or unpublished event requested by non-admin |
| 409 | `EMAIL_TAKEN` | Sign-up with existing email |
| 409 | `ALREADY_REGISTERED` | Active or rejected registration exists |
| 409 | `EVENT_FULL` | Capacity reached |
| 409 | `REGISTRATION_CLOSED` | Unpublished, past deadline, or event started |
| 409 | `INVALID_TRANSITION` | Status change not in the transition table |
| 409 | `CERTIFICATE_EXISTS` | Leaving `ATTENDED` while a certificate exists |
| 409 | `NOT_ATTENDED` | Certificate upload for a non-`ATTENDED` registration |
| 409 | `CAPACITY_BELOW_ACTIVE` | Admin sets capacity lower than current active count |
| 500 | `INTERNAL_ERROR` | Anything unexpected (log server-side, generic message to client) |

### `src/lib/http.ts` (required shape)

```ts
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) { super(message); }
}
export const ok = <T>(data: T, status = 200) => Response.json({ data }, { status });
export const fail = (e: HttpError) =>
  Response.json({ error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } }, { status: e.status });

/** Wrap every Route Handler: catches HttpError → fail(), anything else → 500 INTERNAL_ERROR (console.error). */
export function route<C>(fn: (req: Request, ctx: C) => Promise<Response>) { /* try/catch */ }

/** Parse JSON body with a Zod schema; throws HttpError(400, "VALIDATION_ERROR", ..., z.flattenError(err).fieldErrors). */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>>;
```

Route Handler template:

```ts
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/events/[id]">) => {
  const { id } = await ctx.params;
  // ...
  return ok(payload);
});
```

### `src/lib/authz.ts` (required shape)

```ts
type SessionUser = { id: string; name: string; email: string; role: "PARTICIPANT" | "ADMIN" };
export async function getSessionUser(): Promise<SessionUser | null>;   // wraps auth()
export async function requireUser(): Promise<SessionUser>;             // 401 UNAUTHENTICATED
export async function requireAdmin(): Promise<SessionUser>;            // 401, then 403 FORBIDDEN
export async function requireParticipant(): Promise<SessionUser>;      // 401, then 403 FORBIDDEN
// Page variants (use redirect() from next/navigation instead of throwing):
export async function requireUserPage(callbackPath: string): Promise<SessionUser>;   // → /login?callbackUrl=
export async function requireAdminPage(): Promise<SessionUser>;                      // guest → /login, participant → /
export async function requireParticipantPage(callbackPath: string): Promise<SessionUser>; // admin → /admin
```

The session (JWT) is trusted for `id` and `role`; no DB lookup per request.

## 5. Client data layer

### `src/lib/api-client.ts`

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public fieldErrors?: Record<string, string[]>) { super(message); }
}
/** fetch(path, { credentials: "same-origin", ...init }). Adds "Content-Type: application/json" when
 *  init.body is a string; never sets Content-Type for FormData. Returns json.data or throws ApiError
 *  (falls back to code "INTERNAL_ERROR" if the error body is not JSON). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;

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
```

Invalidate by prefix (e.g. `queryClient.invalidateQueries({ queryKey: ["admin"] })`); each module lists its invalidations.

### `src/components/providers.tsx`
`"use client"`; creates one `QueryClient` in `useState` with `defaultOptions.queries = { staleTime: 30_000, refetchOnWindowFocus: false, retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1 }`. Renders `<QueryClientProvider>` and, in development only, `<ReactQueryDevtools initialIsOpen={false} />`. No `SessionProvider` is needed (session is read on the server).

## 6. Constants (`src/lib/constants.ts`, client-safe)

```ts
export const ROLES = ["PARTICIPANT", "ADMIN"] as const;
export const REGISTRATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "ATTENDED", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const ACTIVE_STATUSES: RegistrationStatus[] = ["PENDING", "APPROVED", "ATTENDED"];
export const CERT_MAX_BYTES = 4 * 1024 * 1024;
export const CERT_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ADMIN_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = { /* see 07 */ };
```

These string unions must match the Prisma enums exactly. Client components import statuses from here, not from the generated Prisma client.

## 7. Dates and formatting

- Store/transport UTC. Display with `date-fns` `format(new Date(iso), "EEE, d MMM yyyy · HH:mm")` in the browser's time zone.
- Event form uses `<Input type="datetime-local">`; convert to ISO with `new Date(localValue).toISOString()` before sending, and back with `format(new Date(iso), "yyyy-MM-dd'T'HH:mm")` when filling the edit form.

## 8. UI conventions

- shadcn init (Radix primitives, base color Neutral), then add exactly:
  `bunx --bun shadcn@4.21.1 add button card input label textarea field select switch badge table dialog alert-dialog dropdown-menu skeleton separator alert empty spinner`
  If a component name is rejected by the CLI, stop and report; do not hand-write a substitute.
- Toasts: `sonner@2.0.8` directly — `import { Toaster, toast } from "sonner"`; `<Toaster richColors position="top-right" />` in root layout; use `toast.success()` / `toast.error(err.message)`.
- Icons: `lucide-react` (installed by shadcn).
- `StatusBadge` mapping: `PENDING` → `secondary` "Pending"; `APPROVED` → `default` "Approved"; `REJECTED` → `destructive` "Rejected"; `ATTENDED` → `outline` with green text "Attended"; `CANCELLED` → `outline` muted "Cancelled".
- Every list has three states: loading (`Skeleton`), empty (`Empty` with a sentence), error (`Alert variant="destructive"` with retry button calling `refetch()`).
- Buttons that trigger mutations show `Spinner` and are `disabled` while `isPending`.
- Accessibility: one `<h1>` per page; visible labels for all inputs; `aria-invalid` on invalid controls; dialogs from shadcn only; icon-only buttons have `aria-label`; tables have `<TableCaption>` or a heading.

## 9. Naming

Files kebab-case; React components PascalCase; Zod schemas `xxxSchema`, inferred types `XxxInput`; Route Handler exports are HTTP verbs only. No default exports except pages, layouts and `proxy.ts`.
