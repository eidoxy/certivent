# Certivent — Product Requirements Document

| | |
|---|---|
| Product | Certivent — event registration with participation certificates |
| Version | 1.0 (MVP) |
| Date | 2026-10-04 |
| Deadline | 2026-10-04 09:00 WIB |
| Production URL | https://aedoxy.com |

## 1. Overview

Organisers run events (seminars, workshops, trainings) and need one place to publish them, collect registrations, track who actually attended and hand out participation certificates. Participants need to find events, sign up, follow the status of their registration and download their certificate later.

Certivent is a single Next.js web application with two roles:

- **Participant** — self-registers, browses published events, registers, tracks registrations, downloads issued certificates.
- **Administrator** — manages events, reviews registrations, changes participant status, uploads certificates.

## 2. Goals

1. A participant can go from sign-up to downloaded certificate without help.
2. An administrator can create an event, process its registrations and issue certificates from one dashboard.
3. All data is stored in a relational database (PostgreSQL) with enforced relations and constraints.
4. Every protected action is authenticated and authorized on the server; every input is validated on the server.
5. The app is publicly reachable over HTTPS on a custom domain, built from a Git repository with CI.

## 3. Non-goals (MVP)

Email verification, password reset, email/push notifications, payments, event images, event deletion, multi-admin management UI, i18n (UI is English only), Swagger/OpenAPI docs, automated test suites, analytics, dark mode toggle.

## 4. Roles and access

| Capability | Guest | Participant | Admin |
|---|---|---|---|
| View landing, browse published events, view event detail | ✅ | ✅ | ✅ (read-only) |
| Sign up (creates a Participant) | ✅ | — | — |
| Log in / log out | ✅ / — | ✅ | ✅ |
| Register for / cancel own registration | — | ✅ | ❌ |
| View own registrations + download own certificate | — | ✅ | — |
| Admin dashboard, create/edit/publish events | — | ❌ | ✅ |
| View participants of any event, change status | — | ❌ | ✅ |
| Upload / replace / remove certificates, download any certificate | — | ❌ | ✅ |

Admin accounts are created only by the seed script. Public sign-up always creates a `PARTICIPANT`.

## 5. User stories

### Participant
- **P-01** As a visitor I can create an account with name, email and password so that I can register for events.
- **P-02** As a participant I can log in and log out.
- **P-03** As anyone I can browse a list of upcoming published events and search by title or location.
- **P-04** As anyone I can open an event and see its description, schedule, location, capacity and whether registration is open.
- **P-05** As a participant I can register for an open event once; I see my registration status on the event page.
- **P-06** As a participant I can cancel a `PENDING` or `APPROVED` registration before the event starts, and register again later.
- **P-07** As a participant I can see all my registrations with their status on "My events".
- **P-08** As a participant I can download my certificate from "My events" once it has been issued.

### Administrator
- **A-01** As an admin I can log in and land on an admin dashboard with key counts.
- **A-02** As an admin I can create an event (draft or published).
- **A-03** As an admin I can edit any event field, including publishing/unpublishing.
- **A-04** As an admin I can see all registrations for an event and filter them by status.
- **A-05** As an admin I can change a registration's status following the allowed transitions.
- **A-06** As an admin I can upload, replace, download and remove a certificate for an `ATTENDED` registration.

## 6. Business rules

1. **Registration status lifecycle**: `PENDING` (initial) → `APPROVED` | `REJECTED`; `APPROVED` → `ATTENDED`. Participants can set `CANCELLED`. Full transition table: `features/07-admin-participants.md`.
2. **Active registrations** are those with status `PENDING`, `APPROVED` or `ATTENDED`. Only active registrations count toward capacity.
3. **Capacity** is optional (`null` = unlimited). When `activeCount >= capacity`, new registrations are refused.
4. **Registration window**: open while the event is published, the current time is before `registrationDeadline` (or before `startsAt` if no deadline), and the event is not full.
5. **One registration per participant per event** (database unique constraint). Re-registering after `CANCELLED` reactivates the same record to `PENDING`. `REJECTED` participants cannot re-register.
6. **Certificates** can be uploaded only for `ATTENDED` registrations; one certificate per registration (replace allowed). A certificate is "issued" when its record exists. An `ATTENDED` registration with a certificate cannot be moved to another status until the certificate is removed.
7. **Visibility**: unpublished events are invisible to guests and participants (404), visible to admins.
8. **Times** are stored in UTC and displayed in the viewer's browser time zone.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Passwords hashed with bcrypt (cost 10). JWT session cookie (httpOnly) via Auth.js. Authorization enforced in every Route Handler; `proxy.ts` only redirects. Certificates in a private bucket, served through short-lived (60 s) signed URLs after an ownership check. Secrets only in server env vars. |
| Validation | Shared Zod schemas validate on client (react-hook-form) and server (Route Handlers). Server returns 400 with field errors. |
| Accessibility | Every input has a visible label; errors linked via `aria-invalid`; keyboard-operable dialogs and menus (shadcn primitives); sufficient contrast; semantic headings. |
| Performance | Vercel region `sin1` next to Supabase `ap-southeast-1`. Lists ≤ 100 items, no pagination in MVP. |
| Reliability | Capacity check and insert run in one transaction with a row lock on the event. |
| Deployment | Vercel (production on push to `main`), Supabase Postgres + Storage, custom domain `aedoxy.com`, GitHub Actions CI (lint, type-check, build). |
| Documentation | README with stack, decisions/trade-offs, ERD, setup, env vars, API table, demo credentials, URL. |

## 8. Tech stack (pinned)

| Purpose | Package | Version |
|---|---|---|
| Runtime / package manager | Node.js / Bun | 24.x / 1.4.2 |
| Framework | next, react, react-dom | 16.3.8, 19.2.8, 19.2.8 |
| Language | typescript | 5.9.3 (`^5`) |
| Styling | tailwindcss, @tailwindcss/postcss | 4.3.3 (`^4`) |
| UI | shadcn CLI (Radix primitives) | 4.21.1 |
| ORM | prisma, @prisma/client, @prisma/adapter-pg, pg | 7.10.0, 7.10.0, 7.10.0, 8.23.1 |
| Database | Supabase PostgreSQL (Supavisor pooler) | — |
| Auth | next-auth (Auth.js v5), bcryptjs | 5.0.0-beta.32, 3.0.3 |
| Validation / forms | zod, react-hook-form, @hookform/resolvers | 4.6.5, 7.89.0, 5.9.1 |
| Data fetching | @tanstack/react-query (+ devtools) | 5.104.1 |
| File storage | @supabase/supabase-js (server only) | 2.117.2 |
| Utilities | date-fns, dotenv | 4.4.0, 18.0.5 |
| Lint | eslint, eslint-config-next | 9.39.x, 16.3.8 |

## 9. Assumptions

1. Status set and transitions as in §6 (not the simpler REGISTERED/ATTENDED/CANCELLED set).
2. Certificates only for `ATTENDED`; file types PDF/PNG/JPEG, max 4 MB.
3. One Supabase project serves both development and production for the MVP.
4. Admins may create events with past dates (to issue certificates for past events).
5. Events cannot be deleted in the MVP; unpublishing hides them.
6. Search is a case-insensitive substring match on title and location.

## 10. Acceptance (demo script)

1. Guest opens `https://aedoxy.com`, browses events, opens one, is asked to log in to register.
2. Guest signs up → is logged in as participant → registers → sees `PENDING` on the event page and on My events.
3. Admin logs in → dashboard shows the pending registration → opens the event's participants → sets `APPROVED`, then `ATTENDED` → uploads a PDF certificate.
4. Participant refreshes My events → clicks Download certificate → the file downloads.
5. Participant tries `/admin` → redirected; calling an admin API directly returns 403.
6. Registering twice returns 409; registering for a full event returns 409; invalid form input shows field errors.
7. CI is green on `main`; README is present.

## 11. Feature module index (build order)

| # | Doc | Covers |
|---|---|---|
| 00 | `features/00-conventions.md` | Rules every module follows: Next 16 specifics, folders, API envelope, errors, helpers, query keys, dates, UI |
| 01 | `features/01-data-model.md` | Prisma schema, config, client singleton, constants, derived rules, seed |
| 02 | `features/02-auth.md` | Sign-up, login, logout, session, roles, proxy, guards |
| 03 | `features/03-events-browse.md` | Landing, public event list and detail |
| 04 | `features/04-event-registration.md` | Register / cancel, capacity, transaction |
| 05 | `features/05-my-events.md` | Participant registrations page |
| 06 | `features/06-admin-events.md` | Admin dashboard, event CRUD, publish |
| 07 | `features/07-admin-participants.md` | Participants table, status transitions |
| 08 | `features/08-certificates.md` | Upload, replace, remove, download |
| 09 | `features/09-deployment-ci.md` | Env vars, scripts, Supabase, Vercel, domain, CI, migrations |

Cut order if behind schedule: search → dashboard counts → registration deadline → participant cancel → capacity. Modules 01–08 core flows are never cut.
