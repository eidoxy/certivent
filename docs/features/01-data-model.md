# 01 — Data model (Prisma 7 + Supabase Postgres)

Depends on: 00. Blocks: every other module.

## 1. Files to create

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Models below (exact) |
| `prisma.config.ts` | Prisma CLI config (exact) |
| `prisma/migrations/migration_lock.toml` + `prisma/migrations/0_init/migration.sql` | First migration (see §6) |
| `src/lib/db.ts` | PrismaClient singleton with `PrismaPg` adapter |
| `src/lib/constants.ts` | Client-safe enums/limits (see 00 §6) |
| `src/lib/registration-rules.ts` | Pure derived-state helpers (§5) |
| `prisma/seed.ts` | Idempotent seed (§7) |

Add `/src/generated` to `.gitignore`.

## 2. `prisma/schema.prisma` (exact)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  PARTICIPANT
  ADMIN
}

enum RegistrationStatus {
  PENDING
  APPROVED
  REJECTED
  ATTENDED
  CANCELLED
}

model User {
  id                   String         @id @default(cuid())
  name                 String
  email                String         @unique
  passwordHash         String
  role                 Role           @default(PARTICIPANT)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  registrations        Registration[]
  eventsCreated        Event[]        @relation("EventCreatedBy")
  certificatesUploaded Certificate[]  @relation("CertificateUploadedBy")
}

model Event {
  id                   String         @id @default(cuid())
  title                String
  description          String
  location             String
  startsAt             DateTime
  endsAt               DateTime
  capacity             Int?
  registrationDeadline DateTime?
  isPublished          Boolean        @default(false)
  createdById          String
  createdBy            User           @relation("EventCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  registrations        Registration[]
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  @@index([isPublished, startsAt])
}

model Registration {
  id          String             @id @default(cuid())
  userId      String
  eventId     String
  status      RegistrationStatus @default(PENDING)
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  event       Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  certificate Certificate?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@unique([userId, eventId])
  @@index([eventId, status])
}

model Certificate {
  id             String       @id @default(cuid())
  registrationId String       @unique
  registration   Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  storageKey     String
  fileName       String
  mimeType       String
  sizeBytes      Int
  uploadedById   String
  uploadedBy     User         @relation("CertificateUploadedBy", fields: [uploadedById], references: [id], onDelete: Restrict)
  issuedAt       DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

Rules: no `url`/`directUrl` in the datasource (Prisma 7 removed them); no `@@map`/`@map` (raw SQL in module 04 relies on the default table name `"Event"`).

ERD (for README):

```
User 1──* Registration *──1 Event
User 1──* Event (createdBy)
Registration 1──0..1 Certificate
User 1──* Certificate (uploadedBy)
```

## 3. `prisma.config.ts` (exact)

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    // CLI (migrate/diff/studio) uses the Supabase SESSION pooler (port 5432).
    url: env("DIRECT_URL"),
  },
});
```

`env()` throws when the variable is missing, so CI must define a placeholder `DIRECT_URL` (module 09).

## 4. `src/lib/db.ts` (exact behaviour)

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL, // Supabase TRANSACTION pooler, port 6543
    max: 5,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Connection notes:
- `DATABASE_URL` must NOT contain `sslmode=` or `pgbouncer=`. `pg` would let a URL `sslmode` override the `ssl` object, and `pgbouncer=true` is a Prisma 6 engine flag with no meaning for `pg`.
- `rejectUnauthorized: false` keeps TLS encryption but skips CA verification (Supabase uses its own CA). Accepted MVP trade-off; upgrade path: download the Supabase CA certificate and pass `ssl: { ca }`.
- Assumption: `@prisma/adapter-pg` uses unnamed prepared statements, which the transaction pooler supports. If the error `prepared statement "…" already exists` appears, switch `DATABASE_URL` to the session pooler (port 5432) and report it.
- Prisma error classes come from the generated client: `import { Prisma } from "@/generated/prisma/client"`; unique violation = `e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"`.

## 5. Derived rules (`src/lib/registration-rules.ts`, client-safe, pure)

```ts
import { ACTIVE_STATUSES, type RegistrationStatus } from "./constants";

export type ClosedReason = "UNPUBLISHED" | "STARTED" | "DEADLINE_PASSED" | "FULL" | null;

export function isActiveStatus(s: RegistrationStatus): boolean; // ACTIVE_STATUSES.includes(s)

export function registrationState(
  event: { isPublished: boolean; startsAt: Date; registrationDeadline: Date | null; capacity: number | null },
  activeCount: number,
  now: Date = new Date(),
): { isFull: boolean; isOpen: boolean; closedReason: ClosedReason };
```

Evaluation order (first match wins):
1. `!isPublished` → `UNPUBLISHED`
2. `now >= startsAt` → `STARTED`
3. `registrationDeadline && now >= registrationDeadline` → `DEADLINE_PASSED`
4. `capacity !== null && activeCount >= capacity` → `FULL`
5. otherwise open (`closedReason: null`)

`isFull` = `capacity !== null && activeCount >= capacity`, independent of the other checks. `isOpen` = `closedReason === null`.

Counting active registrations in Prisma (use this exact include wherever `activeCount` is needed for one or many events):

```ts
include: {
  _count: { select: { registrations: { where: { status: { in: ["PENDING", "APPROVED", "ATTENDED"] } } } } },
}
// activeCount = event._count.registrations
```

## 6. First migration (no shadow database)

`prisma migrate dev` needs a shadow database, which is unreliable through Supabase's pooler. Generate SQL with `migrate diff` and apply with `migrate deploy`:

```powershell
bunx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/0_init/migration.sql
bunx prisma migrate deploy
bunx prisma generate
```

Create `prisma/migrations/migration_lock.toml` with:

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

Later schema changes: `bunx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output prisma/migrations/<yyyyMMddHHmm>_<name>/migration.sql`, then `migrate deploy`. Never use PowerShell `>` redirection for SQL (writes UTF-16).

## 7. Seed (`prisma/seed.ts`)

Run with `bunx prisma db seed` (Prisma 7 never seeds automatically). Use a relative import: `import { PrismaClient } from "../src/generated/prisma/client";` and build its own `PrismaPg` adapter from `process.env.DIRECT_URL` (same options as §4). Requirements:

1. Read `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (exit with an error if missing or password < 8 chars).
2. `upsert` the admin by email: `name: "Administrator"`, `role: ADMIN`, `passwordHash: await bcrypt.hash(password, 10)` (`import bcrypt from "bcryptjs"`).
3. If `prisma.event.count() === 0`, create these events with `createdById = admin.id` (dates relative to `now`):

| title | startsAt | endsAt | capacity | deadline | isPublished |
|---|---|---|---|---|---|
| Intro to Web Accessibility | now + 7 d 09:00 | +3 h | 50 | startsAt − 1 d | true |
| Cloud Deployment Workshop | now + 14 d 13:00 | +4 h | 2 | null | true |
| Internal Planning Session (draft) | now + 21 d 10:00 | +2 h | null | null | false |

The capacity-2 event exists to demo `EVENT_FULL`; the draft demos visibility rules. Admins may mark a registration `ATTENDED` before the event date, so the certificate flow can be demoed on any event. Descriptions: 2–3 plain sentences each, location strings like "Room B201, Main Campus".
4. Log what was created/skipped and `await prisma.$disconnect()`.
