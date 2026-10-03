import { Badge } from "@/components/ui/badge";
import type { RegistrationStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_BADGES: Record<
  RegistrationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  ATTENDED: { label: "Attended", variant: "outline", className: "text-primary" },
  CANCELLED: { label: "Cancelled", variant: "outline", className: "text-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: RegistrationStatus;
  className?: string;
}) {
  const { label, variant, className: tone } = STATUS_BADGES[status];
  return (
    <Badge variant={variant} className={cn(tone, className)}>
      {label}
    </Badge>
  );
}
