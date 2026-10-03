import { ParticipantsTable } from "@/components/participants-table";

export const metadata = { title: "Participants | Admin | Certivent" };

export default async function ParticipantsPage({
  params,
}: PageProps<"/admin/events/[id]/participants">) {
  const { id } = await params;
  // Keyed by event so the filter and cached rows never carry over between events.
  return <ParticipantsTable key={id} eventId={id} />;
}
