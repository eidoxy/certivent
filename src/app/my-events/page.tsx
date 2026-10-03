import { MyRegistrations } from "@/components/my-registrations";
import { requireParticipantPage } from "@/lib/authz";

export const metadata = { title: "My events | Certivent" };

export default async function MyEventsPage() {
  await requireParticipantPage("/my-events");
  return <MyRegistrations />;
}
