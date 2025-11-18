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
  { status: "IN_REPAIR", label: "In Repair", icon: Clock },
  { status: "AWAITING_CUSTOMER", label: "Awaiting Response", icon: AlertCircle },
  { status: "RESOLVED", label: "Resolved", icon: Check },
];

export function TicketStatusTimeline({ events, currentStatus }: TicketStatusTimelineProps) {
  const getStatusEvent = (status: string) => {
    return events.find((e) => e.type === `status_change_to_${status.toLowerCase()}`);
  };

  const isStatusCompleted = (status: string) => {
    const statusOrder = statusSteps.map(s => s.status);
    const currentIndex = statusOrder.indexOf(currentStatus);
    const statusIndex = statusOrder.indexOf(status);
    return statusIndex <= currentIndex;
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

          {statusSteps.map((step, index) => {
            const event = getStatusEvent(step.status);
            const isCompleted = isStatusCompleted(step.status);
            const isCurrent = currentStatus === step.status;
            const Icon = step.icon;

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
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
                          isCompleted ? "text-foreground" : "text-muted-foreground"
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
                      {!event && isCompleted && (
                        <p className="mt-1 text-sm text-muted-foreground">In progress</p>
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
