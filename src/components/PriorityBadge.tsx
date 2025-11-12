import { Badge } from "@/components/ui/badge";
import { AlertCircle, Circle, AlertTriangle } from "lucide-react";

interface PriorityBadgeProps {
  priority: "LOW" | "NORMAL" | "URGENT";
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = {
    LOW: {
      label: "Low Priority",
      icon: Circle,
      className: "bg-muted text-muted-foreground",
    },
    NORMAL: {
      label: "Normal Priority",
      icon: AlertCircle,
      className: "bg-primary/10 text-primary",
    },
    URGENT: {
      label: "Urgent",
      icon: AlertTriangle,
      className: "bg-destructive/10 text-destructive",
    },
  };

  const { label, icon: Icon, className: badgeClass } = config[priority];

  return (
    <Badge variant="outline" className={`${badgeClass} ${className || ""}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
