# Certivent

Certivent is an event registration app with participation certificates, built as a time-boxed MVP (about ~8 hours from 12 AM from plan to deploy). Organisers publish events, approve registrations, mark attendance and issue certificates. Participants find events, register, follow their status and download their certificate.

**Two roles**

| Role | Can do |
|---|---|
| Participant | Sign up, browse published events, register or cancel, see "My events", download their own certificate |
| Administrator | Create, edit and publish events, review participants, change registration status, upload, replace or remove certificates |

Admins are created only by the seed script. Public sign-up always creates a participant.

## Tech stack and decisions

Every choice below was made to ship a working, secure product inside the time limit. "Rejected" lists the alternative I considered.

| Area | Choice | Why, given the deadline | Rejected |
|---|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | One deployable unit: UI and REST API (Route Handlers) in the same repo. No separate backend to build or host | Separate API server: double the setup |
| Database | Supabase Postgres via Prisma 7 (`@prisma/adapter-pg`) | Relational constraints do the heavy lifting (unique registration per user/event, cascades). Prisma gives typed queries and versioned migrations | Raw SQL: slower to write safely |
| Connection | Transaction pooler (`DATABASE_URL`, :6543) at runtime, session pooler (`DIRECT_URL`, :5432) for the CLI | Serverless functions need pooling. The direct host is IPv6-only, so it fails on many networks and CI | Direct connection |
| Auth | Auth.js v5, credentials provider, JWT sessions, bcrypt | No session table, no external vendor, and the role travels in the token, so checks need no DB lookup | Clerk (users would live outside our DB), hand-rolled auth (risk) |
| Storage | Supabase Storage, private bucket, signed URLs | Same vendor as the DB. A private bucket plus 60-second signed links keeps certificates non-public | Vercel Blob (public-by-URL files, third vendor) |
| UI | shadcn/ui (Base UI primitives), Tailwind v4, one emerald accent | Owned, accessible components installed by CLI. No custom design system to build | Hand-rolled components |
| Data | TanStack Query (client), TanStack Table v9 (admin tables) | Caching, invalidation and loading/error states for free. One reusable `DataTable` | Ad-hoc `fetch` + state |
| Validation | Zod 4 shared by forms (react-hook-form) and API | One schema, validated twice. Server returns field errors the form maps directly | Separate client/server rules |
| Deploy | Vercel (`sin1`, next to Supabase Singapore) + GitHub Actions CI | Zero-config Next.js hosting and preview deploys. CI gates every PR | Self-hosting |

**Tradeoffs accepted for time**

- **Manual certificates.** An admin uploads a prepared PDF/PNG/JPEG per participant. There is no template generation and no notification.
- **No automated test suite** (an explicit MVP non-goal). Each feature was instead checked against the real database with scripted runtime acceptance tests during development. Those scripts were temporary and are not committed.
- **Preview deploys share the production database** and run migrations, so schema changes go straight to `main`.
- **Auth.js v5 is still beta.** It needs a typing workaround, documented in `src/types/next-auth.d.ts`.

## Architecture

```
Browser (React client components, TanStack Query)
   |  fetch JSON
   v
Next.js Route Handlers  /api/*   --  auth()/requireAdmin()/requireParticipant()  --  Zod
   |                         |
   | Prisma (postgres role)  | supabase-js (service-role key, server only)
   v                         v
Supabase Postgres        Supabase Storage (private "certificates" bucket)
```

**Data model** (`prisma/schema.prisma`)

```
User 1--* Registration *--1 Event          User 1--* Event (createdBy)
Registration 1--0..1 Certificate           User 1--* Certificate (uploadedBy)
```

- **Statuses:** `PENDING -> APPROVED | REJECTED`, then `APPROVED -> ATTENDED`. A participant may `CANCEL`. The full admin transition table is in `src/lib/constants.ts`.
- **Uniqueness:** `@@unique([userId, eventId])` allows one registration per participant per event. A cancelled row is reactivated, not duplicated.
- **Capacity:** "active" registrations are `PENDING`, `APPROVED` and `ATTENDED`. Capacity is enforced inside a transaction that locks the event row (`SELECT ... FOR UPDATE`), so concurrent sign-ups cannot overbook.

**Auth and authorization**

- **`src/proxy.ts`** (Next 16 middleware) only does UX redirects. It is not the security boundary.
- **Every Route Handler** calls a guard first: `requireUser`, `requireParticipant` or `requireAdmin`. These return 401 or 403 in a consistent error envelope (`src/lib/http.ts`).
- **Ownership** is checked server-side. For example, only the owner or an admin can download a certificate.
- **Database lockdown.** Migration `20261004054000_lock_down_public_api` enables RLS and revokes the `anon`/`authenticated` roles, so Supabase's public Data API exposes no tables. Prisma connects as `postgres` and is unaffected.

**API**

| Area | Routes |
|---|---|
| Public | `GET /api/events`, `GET /api/events/[id]`, `POST /api/register` |
| Participant | `POST`/`DELETE /api/events/[id]/register`, `GET /api/me/registrations` |
| Owner or admin | `GET /api/certificates/[id]` (302 to a 60 s signed URL) |
| Admin | `GET /api/admin/stats`, `GET`/`POST /api/admin/events`, `GET`/`PATCH /api/admin/events/[id]`, `GET /api/admin/events/[id]/registrations`, `PATCH /api/admin/registrations/[id]`, `POST`/`DELETE /api/admin/registrations/[id]/certificate` |

**Storage.** Objects live at `{eventId}/{registrationId}/{uuid}.{ext}`.

- **Upload checks:** the server checks role, `ATTENDED` status, size (4 MB max) and MIME type, and verifies magic bytes, so an `.exe` renamed to `.pdf` is rejected.
- **Order of writes:** the server uploads the file first, then writes the DB row, and rolls the file back if the row fails.
- **Replace and remove:** both delete the old object.

## End-to-end flow

1. **Participant registers.** On `/events/[id]`, Register creates a `PENDING` registration. Registration is refused if the event is full, past its deadline or already started.
2. **Admin approves.** On `/admin/events/[id]/participants`, the admin sets **Approved**. Only allowed transitions are offered, and the server enforces the same table.
3. **Admin marks attendance.** The admin sets **Attended**. Pending cannot jump straight to Attended.
4. **Admin uploads the certificate.** Upload certificate opens a dialog and the admin picks a PDF, PNG or JPEG. While a certificate exists, the status is locked at Attended.
5. **Participant downloads it.** On `/my-events` the row shows **Download certificate**. Clicking it hits `/api/certificates/[id]`, which checks ownership and redirects to a 60-second signed link. Before step 4 the cell reads "Not issued yet".

Nothing in this flow is automatic or time-based. Every status change after registration is an explicit admin action.

## How this maps to the evaluation criteria

- **Engineering decisions.** Each choice above trades breadth for delivery speed without trading away correctness. Integrity rules live in the database and in transactions, not just in the UI.
- **Code quality.**
  - TypeScript strict, Zod at every boundary, and one shared error envelope.
  - Server-only modules (`db`, `auth`, `storage`, `env`) are never imported by client components.
  - Lint and type-check are clean.
  - Exact versions are pinned for the core stack.
- **Architecture.**
  - Thin server pages handle access control, and client components fetch via REST.
  - Secrets stay server-side; none appear in the client bundle (checked against `.next/static`).
  - Conventions are written down in `docs/features/00-conventions.md`.
- **Functional product in the time limit.**
  - Built in spec-driven modules (`docs/features/01-09`).
  - Feature modules 01-08 were each verified with type-check, lint, build and runtime checks against the real database before the next one started.
  - Module 09 (deployment) is verified up to a clean-checkout CI build.
  - Both roles work end to end.

## Running locally

```bash
bun install                 # also runs prisma generate
cp .env.example .env        # fill in the values (names below)
bun run db:deploy           # apply migrations (uses DIRECT_URL)
bun run db:seed             # creates the admin + demo events
bun run dev                 # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (app runtime) |
| `DIRECT_URL` | Supabase session pooler (migrations, seed) |
| `AUTH_SECRET` | Auth.js session signing |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side Storage access. Never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_CERT_BUCKET` | Private bucket name (`certificates`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed only. Log in as admin with these |

Checks: `bun run typecheck`, `bun run lint`, `bun run build`. CI (`.github/workflows/ci.yml`) runs the same on every push and PR. Vercel deploys with `bun run build:vercel`, which applies migrations before building. Full setup is in `docs/features/09-deployment-ci.md`.

## Known limitations and next steps

- **Certificates are manual.** Candidates: a bulk "mark approved as attended" action, PDF generation from a template, and an email when a certificate is issued.
- **Missing account basics:** no email verification or password reset (MVP non-goals).
- **Cleanup left:**
  - Unused scaffolding: `@supabase/ssr` and `ai` in `package.json`.
  - Some `^` ranges to pin.
- **Docs to update:** `docs/` predates two build-time details, Base UI's `render` prop pattern and TanStack Table v9.
