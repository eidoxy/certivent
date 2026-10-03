import Link from "next/link";
import { getSessionUser } from "@/lib/authz";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/" className="mr-3 text-base font-semibold">
            Certivent
          </Link>
          <Button variant="ghost" nativeButton={false} render={<Link href="/events" />}>
            Events
          </Button>
          {user?.role === "PARTICIPANT" && (
            <Button variant="ghost" nativeButton={false} render={<Link href="/my-events" />}>
              My events
            </Button>
          )}
          {user?.role === "ADMIN" && (
            <Button variant="ghost" nativeButton={false} render={<Link href="/admin" />}>
              Admin
            </Button>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Log in
              </Button>
              <Button nativeButton={false} render={<Link href="/register" />}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
