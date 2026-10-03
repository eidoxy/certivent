# 09 — Environment, deployment & CI/CD

Depends on: all. Implement the scripts/env parts in the first hour; deploy as soon as the hello page builds.

## 1. Environment variables

Single local file `.env` (read by Next.js, Bun and `prisma.config.ts` via `dotenv/config`). Commit `.env.example` with the same keys and empty values.

| Key | Used by | Value |
|---|---|---|
| `DATABASE_URL` | app runtime (`PrismaPg`) | Supabase **transaction** pooler, port 6543. No `sslmode`/`pgbouncer` params |
| `DIRECT_URL` | Prisma CLI, seed | Supabase **session** pooler, port 5432 |
| `AUTH_SECRET` | Auth.js | `bunx auth secret` (it writes to `.env.local`; move the line into `.env`). Use a separate value in production |
| `SUPABASE_URL` | storage | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | storage | secret/service-role key — never `NEXT_PUBLIC_` |
| `SUPABASE_CERT_BUCKET` | storage | `certificates` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only (local) | demo admin credentials |

`.gitignore` additions: `!.env.example` (after the existing `.env*` line) and `/src/generated`.

## 2. `package.json` changes

```jsonc
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "build:vercel": "prisma migrate deploy && next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit",
  "postinstall": "prisma generate",
  "db:deploy": "prisma migrate deploy",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio"
},
"trustedDependencies": ["sharp", "unrs-resolver", "prisma", "@prisma/engines"]
```

- `postinstall` regenerates the client on every install (Vercel caches `node_modules`).
- `trustedDependencies` lets Bun run Prisma's engine download on Vercel/CI (Bun blocks dependency lifecycle scripts by default).
- `typecheck` runs `next typegen` first because `PageProps`/`LayoutProps`/`RouteContext` are generated types.
- Keep the existing `packageManager`, `ignoreScripts` fields unchanged.

## 3. Supabase (dashboard)

1. Project region **Southeast Asia (Singapore)**. DB password without URL-special characters (or URL-encode it).
2. **Connect → ORMs → Prisma** (or Connection string): copy transaction pooler (6543) → `DATABASE_URL`, session pooler (5432) → `DIRECT_URL`. Do not use the direct `db.<ref>.supabase.co` host (IPv6-only).
3. **Project Settings → Data API**: disable (Prisma tables in `public` would otherwise be exposed through the REST API).
4. **Storage → New bucket** `certificates`: Public **off**, file size limit 4 MB, allowed MIME types `application/pdf, image/png, image/jpeg`.
5. **Project Settings → API Keys**: copy project URL and the secret/service-role key.
6. Locally: migrate and seed (01 §6–7): `bunx prisma migrate deploy`, then `bunx prisma db seed`.

## 4. Vercel

1. **Add New → Project**, import the GitHub repo. Framework preset Next.js; install command auto-detected from `bun.lock` (`bun install`).
2. **Build Command** override: `bun run build:vercel`.
3. **Environment Variables** (Production + Preview): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_CERT_BUCKET`.
4. **Settings → Functions → Function Region**: `sin1` (Singapore).
5. **Settings → Domains**: add `aedoxy.com` (primary) and `www.aedoxy.com` (308 redirect to primary). In Cloudflare DNS: `A @ →` the IP Vercel shows, `CNAME www →` the target Vercel shows, both **DNS only (grey cloud)**; delete conflicting `@`/`www` records; if CAA records exist add `0 issue "letsencrypt.org"`. Wait for "Valid Configuration".
6. Deploys: push to `main` → production; PR → preview. Trade-off: previews share the production database and run `migrate deploy`; merge schema changes straight to `main` during the MVP.

## 5. GitHub Actions — `.github/workflows/ci.yml` (exact)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
      DIRECT_URL: postgresql://ci:ci@localhost:5432/ci
      AUTH_SECRET: ci-placeholder-secret-not-used-in-production
      SUPABASE_URL: https://ci-placeholder.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: ci-placeholder
      SUPABASE_CERT_BUCKET: certificates
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.2
      - run: bun install --frozen-lockfile
      - run: bunx prisma validate
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run build
```

CI never touches a real database: `build` (not `build:vercel`) skips migrations, and no page may query Prisma at build time (pages that call `auth()` are dynamic; Route Handlers run only on request). Optionally protect `main` with "Require status checks: verify".

## 6. README checklist (written last, ≤ 1 page + tables)

Stack & versions (PRD §8) · Architecture sketch (Next.js app = UI + REST Route Handlers; Supabase Postgres via Prisma; Supabase Storage) · Key decisions & trade-offs (Auth.js JWT over Clerk; Prisma 7 adapter + pooler; private bucket + signed URLs; Vercel + `sin1`) · ERD (01 §2) · API table (method, path, role, purpose, main errors) · Local setup (`bun install`, `.env`, migrate, seed, `bun dev`) · Env vars table (§1, no values) · Demo credentials (admin from seed, or "sign up as participant") · Production URL `https://aedoxy.com`.

## 7. Acceptance

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass locally and in CI.
- [ ] Vercel production build applies migrations and serves `https://aedoxy.com` with a valid certificate; `www` redirects.
- [ ] Both roles work end-to-end in production (PRD §10).
