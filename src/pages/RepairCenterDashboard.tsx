import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Package, Calendar, Hash, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";

export default function RepairCenterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairCenter, setRepairCenter] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Get repair center info
      const { data: centerData } = await supabase
        .from("repair_centers")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (!centerData) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "No repair center associated with your account",
        });
        navigate("/");
        return;
      }

      setRepairCenter(centerData);

      // Load tickets
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku),
          assigned_staff:profiles!tickets_assigned_to_fkey (full_name)
        `)
        .eq("repair_center_id", centerData.id)
        .eq("status", "IN_REPAIR")
        .order("created_at", { ascending: false });

      setTickets(ticketsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Error loading tickets",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRepairStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ repair_status: newStatus as any })
        .eq("id", ticketId);

      if (error) throw error;

      // Create event
      await supabase.from("ticket_events").insert({
        ticket_id: ticketId,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: `Repair status changed to ${newStatus.replace("_", " ")}`,
      });

      toast({
        title: "Status updated",
        description: "Repair status has been updated successfully",
      });

      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error updating status",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Repair Center Dashboard</h1>
          <p className="text-muted-foreground">
            {repairCenter?.name} - {repairCenter?.region}
          </p>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-1">No tickets assigned</p>
              <p className="text-muted-foreground">
                There are currently no repair tickets assigned to your center
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        Ticket #{ticket.ticket_number}
                        <StatusBadge status={ticket.status} />
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {format(new Date(ticket.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    {ticket.repair_status && (
                      <Badge variant="outline">
                        {ticket.repair_status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Product</p>
                        <p className="font-medium">{ticket.products?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.products?.sku}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Serial Number</p>
                        <p className="font-medium">{ticket.serial_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Issue Description</p>
                    <p className="text-sm">{ticket.issue}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <label className="text-sm font-medium">Update Repair Status:</label>
                    <Select
                      value={ticket.repair_status || ""}
                      onValueChange={(value) => updateRepairStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="BLOCKED">Blocked</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
