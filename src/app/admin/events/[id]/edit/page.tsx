import { EventForm } from "@/components/event-form";

export const metadata = { title: "Edit event | Admin | Certivent" };

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]/edit">) {
  const { id } = await params;
  return <EventForm mode="edit" eventId={id} />;
}
