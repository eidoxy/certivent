import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "PARTICIPANT" | "ADMIN";
};

/** Wraps auth(). The JWT is trusted for id and role; no DB lookup. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

export async function requireParticipant(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "PARTICIPANT") {
    throw new HttpError(403, "FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

const loginUrl = (callbackPath: string) => `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;

/** Page guard: guest -> /login?callbackUrl=<path>. */
export async function requireUserPage(callbackPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginUrl(callbackPath));
  return user;
}

/** Page guard: guest -> /login?callbackUrl=/admin, participant -> /. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginUrl("/admin"));
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Page guard: guest -> /login?callbackUrl=<path>, admin -> /admin. */
export async function requireParticipantPage(callbackPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginUrl(callbackPath));
  if (user.role === "ADMIN") redirect("/admin");
  return user;
}
