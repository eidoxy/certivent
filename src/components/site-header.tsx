import { SiteNavbar, type NavLink } from "@/components/site-navbar";
import { signOut } from "@/lib/auth";
import { getSessionUser } from "@/lib/authz";

// Only routes that exist (modules 01-08). Participants and certificates have no routes of their own:
// participants are managed per event and certificates are downloaded from My events.
const VISITOR_LINKS: readonly NavLink[] = [
  { href: "/events", label: "Discover" },
  { href: "/#features", label: "Manage Events" },
  { href: "/#preview", label: "Attendees" },
];
const PARTICIPANT_LINKS: readonly NavLink[] = [
  { href: "/events", label: "Discover" },
  { href: "/my-events", label: "My events" },
];
const ADMIN_LINKS: readonly NavLink[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/events", label: "Events" },
  { href: "/events", label: "Discover" },
];

export async function SiteHeader() {
  const user = await getSessionUser();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const links = !user ? VISITOR_LINKS : user.role === "ADMIN" ? ADMIN_LINKS : PARTICIPANT_LINKS;
  const cta = !user
    ? { href: "/register", label: "Join Now" }
    : user.role === "ADMIN"
      ? { href: "/admin/events/new", label: "Create Event" }
      : null;

  return (
    <SiteNavbar
      links={links}
      cta={cta}
      user={user ? { name: user.name, role: user.role } : null}
      signOutAction={signOutAction}
    />
  );
}
