import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TicketStatus = "OPEN" | "UNDER_REVIEW" | "IN_REPAIR" | "AWAITING_CUSTOMER" | "RESOLVED" | "REJECTED" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_COMPLETED" | "REPLACEMENT_APPROVED" | "REJECTED_OUT_OF_WARRANTY" | "SHIPPING" | "PRODUCT_EVALUATION" | "REPLACEMENT_INITIATED" | "REPAIR_COMPLETED" | "SHIPPED_TO_CUSTOMER" | "CLOSED";

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
    RETURN_REQUESTED: {
      label: "Return Requested",
      className: "bg-blue-500 text-white",
    },
    RETURN_APPROVED: {
      label: "Return Approved",
      className: "bg-green-500 text-white",
    },
    RETURN_COMPLETED: {
      label: "Return Completed",
      className: "bg-status-resolved text-white",
    },
    REPLACEMENT_APPROVED: {
      label: "Replacement Approved",
      className: "bg-purple-500 text-white",
    },
    REJECTED_OUT_OF_WARRANTY: {
      label: "Rejected - Out of Warranty",
      className: "bg-status-rejected text-white",
    },
    SHIPPING: {
      label: "Shipping",
      className: "bg-blue-600 text-white",
    },
    PRODUCT_EVALUATION: {
      label: "Product Evaluation",
      className: "bg-yellow-600 text-white",
    },
    REPLACEMENT_INITIATED: {
      label: "Replacement Initiated",
      className: "bg-indigo-600 text-white",
    },
    REPAIR_COMPLETED: {
      label: "Repair Completed",
      className: "bg-green-600 text-white",
    },
    SHIPPED_TO_CUSTOMER: {
      label: "Shipped to Customer",
      className: "bg-cyan-600 text-white",
    },
    CLOSED: {
      label: "Closed",
      className: "bg-gray-600 text-white",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
