import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Calendar, Mail, User, Package, Hash } from "lucide-react";
import { format } from "date-fns";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("OPEN");
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (id) {
      loadTicketDetails();
    }
  }, [id]);

  const loadTicketDetails = async () => {
    try {
      // Load ticket
      const { data: ticketData } = await supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku, warranty_months),
          assigned_staff:profiles!tickets_assigned_to_fkey (full_name, user_id)
        `)
        .eq("id", id)
        .single();

      if (!ticketData) {
        toast({
          variant: "destructive",
          title: "Ticket not found",
        });
        navigate("/tickets");
        return;
      }

      // Check if user has access
      if (userRole === "CUSTOMER" && ticketData.owner_id !== user?.id) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "You don't have permission to view this ticket",
        });
        navigate("/tickets");
        return;
      }

      setTicket(ticketData);
      setNewStatus(ticketData.status);

      // Load events
      const { data: eventsData } = await supabase
        .from("ticket_events")
        .select(`
          *,
          profiles:by_user_id (full_name)
        `)
        .eq("ticket_id", id)
        .order("created_at", { ascending: false });

      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error loading ticket:", error);
      toast({
        variant: "destructive",
        title: "Error loading ticket",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === ticket.status) {
      toast({
        variant: "destructive",
        title: "No changes",
        description: "Please select a different status",
      });
      return;
    }

    setUpdating(true);

    try {
      // Update ticket status
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: newStatus as any })
        .eq("id", id);

      if (updateError) throw updateError;

      // Create event
      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: statusNote || `Status changed to ${newStatus}`,
      });

      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully",
      });

      setStatusNote("");
      loadTicketDetails();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update ticket status",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClaimTicket = async () => {
    setClaiming(true);
    try {
      // Assign ticket to current user
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ assigned_to: user?.id })
        .eq("id", id);

      if (updateError) throw updateError;

      // Create event
      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "ASSIGNED",
        note: "Ticket claimed by staff member",
      });

      toast({
        title: "Ticket claimed",
        description: "You have been assigned to this ticket",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error claiming ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to claim ticket",
      });
    } finally {
      setClaiming(false);
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

  if (!ticket) return null;

  const canUpdateStatus = userRole === "STAFF" || userRole === "ADMIN";

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
              <StatusBadge status={ticket.status} />
              <Badge variant={ticket.ticket_type === "RETURN" ? "destructive" : "default"}>
                {ticket.ticket_type === "RETURN" ? "Return Request" : "Repair Request"}
              </Badge>
              {ticket.warranty_eligible && (
                <Badge className="bg-success text-success-foreground">
                  Under Warranty
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(ticket.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{ticket.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{ticket.customer_email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Product</p>
                      <p className="font-medium">{ticket.products?.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.products?.sku}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{ticket.serial_number}</p>
                    </div>
                  </div>
                  {ticket.purchase_date && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Purchase Date</p>
                        <p className="font-medium">
                          {format(new Date(ticket.purchase_date), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Issue Description</p>
                  <p className="whitespace-pre-wrap">{ticket.issue}</p>
                </div>
              </CardContent>
            </Card>

            {/* Event Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div
                      key={event.id}
                      className={`flex gap-4 ${index !== events.length - 1 ? "pb-4 border-b" : ""}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {index !== events.length - 1 && (
                          <div className="w-px h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{event.type.replace(/_/g, " ")}</p>
                            <p className="text-sm text-muted-foreground">
                              by {event.profiles?.full_name || "System"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                        {event.note && (
                          <p className="text-sm mt-2 text-muted-foreground">{event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {canUpdateStatus && (
              <>
                {/* Assignment Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticket.assigned_staff ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Assigned to</p>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{ticket.assigned_staff.full_name}</p>
                        </div>
                        {ticket.assigned_to === user?.id && (
                          <Badge variant="secondary" className="mt-2">
                            You are assigned
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">No staff assigned</p>
                        <Button
                          onClick={handleClaimTicket}
                          disabled={claiming}
                          className="w-full"
                          variant="secondary"
                        >
                          {claiming ? "Claiming..." : "Claim Ticket"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status Update Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Update Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                        <SelectItem value="AWAITING_CUSTOMER">Awaiting Customer</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Add a note about this status change..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === ticket.status}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Update Status"}
                  </Button>
                </CardContent>
              </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Warranty Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className={
                      ticket.warranty_eligible
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {ticket.warranty_eligible ? "Eligible" : "Not Eligible"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coverage Period</p>
                  <p className="font-medium">{ticket.products?.warranty_months} months</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
