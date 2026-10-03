import { EventForm } from "@/components/event-form";

export const metadata = { title: "New event | Admin | Certivent" };

export default function NewEventPage() {
  return <EventForm mode="create" />;
}
