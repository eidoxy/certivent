import { EventDetailView } from "@/components/event-detail-view";
import { getSessionUser } from "@/lib/authz";

export default async function EventDetailPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const user = await getSessionUser();
  return <EventDetailView id={id} viewerRole={user?.role ?? null} />;
}
