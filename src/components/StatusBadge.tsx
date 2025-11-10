import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TicketStatus = "OPEN" | "UNDER_REVIEW" | "IN_REPAIR" | "AWAITING_CUSTOMER" | "RESOLVED" | "REJECTED";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
    OPEN: {
      label: "Open",
      className: "bg-status-open text-white",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      className: "bg-status-review text-white",
    },
    IN_REPAIR: {
      label: "In Repair",
      className: "bg-status-repair text-white",
    },
    AWAITING_CUSTOMER: {
      label: "Awaiting Customer",
      className: "bg-status-waiting text-white",
    },
    RESOLVED: {
      label: "Resolved",
      className: "bg-status-resolved text-white",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-status-rejected text-white",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
