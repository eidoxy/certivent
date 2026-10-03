# 02 — Authentication & authorization

Depends on: 00, 01. Stories: P-01, P-02, A-01 (login part).

## 1. Decisions

- Auth.js v5 (`next-auth@5.0.0-beta.32`) with the **Credentials** provider, **JWT** session strategy, no database adapter, no session table.
- Passwords: `bcryptjs` cost 10. Never return or log `passwordHash`.
- Login runs on the client with `signIn("credentials", { redirect: false })` from `next-auth/react` (no `SessionProvider` required). Logout is a Server Action calling `signOut`.
- Roles live in the JWT (`id`, `role`). Admins exist only via seed.

## 2. Validation (`src/lib/validations/auth.ts`)

```ts
import { z } from "zod";

const email = z.string().trim().toLowerCase().max(255).pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
});
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
```

72 is bcrypt's input limit. The API validates with `registerSchema` (no `confirmPassword`).

## 3. `src/lib/auth.ts`

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id as string; token.role = user.role; }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
```

`AUTH_SECRET` is read automatically. On Vercel the host is trusted automatically; locally `next dev` is trusted too. Returning `null` from `authorize` makes the client `signIn` resolve with `error: "CredentialsSignin"`.

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

## 4. Type augmentation (`src/types/next-auth.d.ts`)

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User { role: "PARTICIPANT" | "ADMIN" }
  interface Session {
    user: { id: string; role: "PARTICIPANT" | "ADMIN" } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; role: "PARTICIPANT" | "ADMIN" }
}
```

If `next-auth/jwt` augmentation does not type-check with beta.32, report the compiler error; do not switch to `any`.

## 5. Route protection

### `src/proxy.ts` (UX redirects only — not a security boundary)

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const toLogin = () => {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  };
  if (pathname.startsWith("/admin")) {
    if (!user) return toLogin();
    if (user.role !== "ADMIN") return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (pathname.startsWith("/my-events") && !user) return toLogin();
  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/my-events", "/login", "/register"] };
```

Proxy runs on the Node.js runtime in Next 16 (do not set `runtime`). API routes are not in the matcher; they protect themselves.

### Server guards (`src/lib/authz.ts`) — see 00 §4 for signatures

- `getSessionUser()`: `const s = await auth(); return s?.user ? { id, name, email, role } : null`.
- API guards throw `HttpError(401, "UNAUTHENTICATED", "Please log in")` / `HttpError(403, "FORBIDDEN", "You do not have access to this resource")`.
- Page guards use `redirect()`:
  - `requireUserPage(path)`: guest → `/login?callbackUrl=<encoded path>`.
  - `requireAdminPage()`: guest → `/login?callbackUrl=/admin`; participant → `/`.
  - `requireParticipantPage(path)`: guest → login; admin → `/admin`.

Every Route Handler in modules 03–08 calls exactly one guard as its first statement unless marked "public".

## 6. API

### `POST /api/register` — public

Body: `RegisterInput`. Steps:
1. `parseJson(req, registerSchema)`.
2. If `prisma.user.findUnique({ where: { email } })` exists → 409 `EMAIL_TAKEN` "An account with this email already exists".
3. Create `{ name, email, passwordHash: await bcrypt.hash(password, 10), role: "PARTICIPANT" }`. Map a `P2002` race to the same 409.
4. Respond 201 `{ data: { id, name, email, role } }`.

## 7. Pages

### `/login` — `src/app/(auth)/login/page.tsx`
- Server page renders `<LoginForm callbackUrl={...} />`. Read `searchParams` (Promise) → `callbackUrl`; accept it only if it starts with `/` and not `//`, else `"/"`.
- Client form: Email (`type="email"`, `autoComplete="email"`), Password (`type="password"`, `autoComplete="current-password"`), submit "Log in", link "Create an account" → `/register`.
- Submit: `const res = await signIn("credentials", { email, password, redirect: false })`. If `res?.error` → show form-level `Alert` "Invalid email or password" (never reveal which). Else `router.replace(callbackUrl); router.refresh();`.

### `/register` — `src/app/(auth)/register/page.tsx`
- Fields: Name, Email, Password (`autoComplete="new-password"`), Confirm password. Schema `registerFormSchema`.
- Submit: `apiFetch("/api/register", { method: "POST", body: JSON.stringify({ name, email, password }), headers: { "Content-Type": "application/json" } })`. On `ApiError` with `fieldErrors` → `setError`; `EMAIL_TAKEN` → `setError("email", …)`. On success → `signIn("credentials", { email, password, redirect: false })` → `router.replace("/events"); router.refresh();`.

### `/` — `src/app/page.tsx` (replace the create-next-app placeholder)
- `const user = await getSessionUser()`: admin → `redirect("/admin")`; participant → `redirect("/events")`.
- Guest: landing with `<h1>Certivent</h1>`, one-sentence tagline ("Register for events and collect your participation certificates in one place."), buttons "Browse events" → `/events` and "Create an account" → `/register`.

### Header — `src/components/site-header.tsx` (Server Component, rendered in root layout)
- Left: "Certivent" link to `/`. Nav: "Events" (`/events`); participant: "My events"; admin: "Admin" (`/admin`).
- Right: guest → "Log in", "Sign up" buttons; logged-in → user name + logout form:

```tsx
<form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
  <Button type="submit" variant="ghost">Log out</Button>
</form>
```

### Root layout changes (`src/app/layout.tsx`)
Keep the existing fonts and `LayoutProps<"/">` signature; set `metadata = { title: "Certivent", description: "Event registration and participation certificates" }`; wrap children: `<Providers><SiteHeader /><main className="container mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main><Toaster richColors position="top-right" /></Providers>`.

## 8. Acceptance

- [ ] Sign-up creates a `PARTICIPANT`, logs in, lands on `/events`.
- [ ] Duplicate email → field error on Email.
- [ ] Wrong password → "Invalid email or password".
- [ ] Seeded admin logs in → `/admin`; participant opening `/admin` → `/`; guest opening `/my-events` → `/login?callbackUrl=%2Fmy-events` and returns there after login.
- [ ] `session.user.role` is typed; no `any`.
- [ ] Logout returns to `/` as guest.
