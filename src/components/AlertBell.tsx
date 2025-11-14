import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export function AlertBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setAlerts(data || []);
      setOpenCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "text-destructive";
      case "MEDIUM":
        return "text-orange-500";
      case "LOW":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {openCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {openCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Alerts</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/manager/dashboard")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 border rounded-lg space-y-1 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/manager/dashboard")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.title}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
