import { format } from "date-fns";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineEvent {
  id: string;
  type: string;
  note: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface TicketStatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const statusSteps = [
  { status: "OPEN", label: "Ticket Opened", icon: Clock },
  { status: "UNDER_REVIEW", label: "Under Review", icon: Clock },
  { status: "SHIPPING", label: "Shipping to Repair Center", icon: Clock },
  { status: "PRODUCT_EVALUATION", label: "Product Evaluation", icon: Clock },
  { status: "IN_REPAIR", label: "In Repair", icon: Clock },
  { status: "REPLACEMENT_INITIATED", label: "Replacement Initiated", icon: Clock },
  { status: "REPAIR_COMPLETED", label: "Repair Completed", icon: Check },
  { status: "SHIPPED_TO_CUSTOMER", label: "Shipped to Customer", icon: Clock },
  { status: "AWAITING_CUSTOMER", label: "Awaiting Response", icon: AlertCircle },
  { status: "RESOLVED", label: "Resolved", icon: Check },
  { status: "CLOSED", label: "Closed", icon: Check },
];

export function TicketStatusTimeline({ events, currentStatus }: TicketStatusTimelineProps) {
  // Get all status change events
  const statusEvents = events.filter((e) => 
    e.type === "STATUS_CHANGED" || e.type === "CREATED"
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Extract unique statuses that have occurred
  const occurredStatuses = new Set<string>();
  statusEvents.forEach((e) => {
    if (e.type === "CREATED") {
      occurredStatuses.add("OPEN");
    } else if (e.note) {
      // Try to extract status from note
      const statusMatch = e.note.match(/to (\w+)/i);
      if (statusMatch) {
        occurredStatuses.add(statusMatch[1].toUpperCase().replace(/ /g, '_'));
      }
    }
  });

  // Filter status steps to show only relevant ones
  const relevantSteps = statusSteps.filter(step => 
    occurredStatuses.has(step.status) || step.status === currentStatus
  );

  const getStatusEvent = (status: string) => {
    if (status === "OPEN") {
      return statusEvents.find(e => e.type === "CREATED");
    }
    // Find events where the status was changed to this specific status
    return statusEvents.find((e) => {
      if (e.type === "STATUS_CHANGED" && e.note) {
        const statusLabel = status.toLowerCase().replace(/_/g, ' ');
        return e.note.toLowerCase().includes(`to ${statusLabel}`) ||
               e.note.toLowerCase().includes(`changed to ${statusLabel}`);
      }
      return false;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Ticket Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-border" />

          {relevantSteps.map((step) => {
            const event = getStatusEvent(step.status);
            const hasOccurred = occurredStatuses.has(step.status);
            const isCurrent = currentStatus === step.status;
            const Icon = step.icon;

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    hasOccurred || isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4
                        className={`font-medium ${
                          hasOccurred || isCurrent ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </h4>
                      {event && (
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {event.profiles && (
                            <p className="text-sm text-muted-foreground">
                              by {event.profiles.full_name}
                            </p>
                          )}
                          {event.note && (
                            <p className="mt-2 text-sm text-foreground">{event.note}</p>
                          )}
                        </div>
                      )}
                      {isCurrent && !event && (
                        <p className="mt-1 text-sm text-muted-foreground">Current status</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
