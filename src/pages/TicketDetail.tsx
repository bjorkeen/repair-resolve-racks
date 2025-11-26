import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
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
import { ArrowLeft, Calendar, Mail, User, Package, Hash, X, Clock, Download } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { RepairCenterDialog } from "@/components/RepairCenterDialog";
import { TicketAttachments } from "@/components/TicketAttachments";
import { TicketComments } from "@/components/TicketComments";
import { TicketStatusTimeline } from "@/components/TicketStatusTimeline";
import { FeedbackDialog } from "@/components/FeedbackDialog";

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
  const [cancelling, setCancelling] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("OPEN");
  const [newPriority, setNewPriority] = useState<string>("NORMAL");
  const [statusNote, setStatusNote] = useState("");
  const [showRepairCenterDialog, setShowRepairCenterDialog] = useState(false);
  const [recommendedRepairCenter, setRecommendedRepairCenter] = useState<any>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [repairCenters, setRepairCenters] = useState<any[]>([]);
  const [selectedRepairCenter, setSelectedRepairCenter] = useState<string>("");

  useEffect(() => {
    if (id) {
      loadTicketDetails();
      checkFeedback();
      if (userRole !== "CUSTOMER") {
        loadRepairCenters();
      }
    }
  }, [id, userRole]);

  useEffect(() => {
    // Auto-show feedback dialog for customers when ticket is resolved/rejected/closed
    if (
      userRole === "CUSTOMER" &&
      ticket &&
      !hasFeedback &&
      (ticket.status === "RESOLVED" || ticket.status === "REJECTED" || ticket.status === "CLOSED")
    ) {
      setShowFeedbackDialog(true);
    }
  }, [ticket, hasFeedback, userRole]);

  const checkFeedback = async () => {
    if (!id || !user) return;
    const { data } = await supabase
      .from("ticket_feedback")
      .select("id")
      .eq("ticket_id", id)
      .eq("user_id", user.id)
      .single();
    setHasFeedback(!!data);
  };

  const loadRepairCenters = async () => {
    try {
      const { data } = await supabase
        .from("repair_centers")
        .select("*")
        .order("name");
      setRepairCenters(data || []);
    } catch (error) {
      console.error("Error loading repair centers:", error);
    }
  };

  // Real-time updates for ticket status
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          if (payload.eventType === 'UPDATE') {
            setTicket((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_events',
          filter: `ticket_id=eq.${id}`,
        },
        async (payload) => {
          console.log('New event:', payload);
          // Fetch the new event with profile data
          const { data } = await supabase
            .from('ticket_events')
            .select('*, profiles:by_user_id (full_name)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setEvents((prev) => [data, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadTicketDetails = async () => {
    try {
      // Load ticket
      const { data: ticketData } = await supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku, warranty_months),
          assigned_staff:profiles!tickets_assigned_to_fkey (full_name, user_id),
          repair_centers (name, region, email)
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
      setNewPriority(ticketData.priority || "NORMAL");
      setSelectedRepairCenter(ticketData.repair_center_id || "unassigned");

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

    // If changing to IN_REPAIR, show repair center dialog
    if (newStatus === "IN_REPAIR") {
      await fetchRecommendedRepairCenter();
      return;
    }

    await updateTicketStatus();
  };

  const fetchRecommendedRepairCenter = async () => {
    try {
      const { data: repairCenterData } = await supabase
        .from("repair_center_products")
        .select("repair_centers (*)")
        .eq("product_id", ticket.product_id)
        .single();

      setRecommendedRepairCenter(repairCenterData?.repair_centers || null);
      setShowRepairCenterDialog(true);
    } catch (error) {
      console.error("Error fetching repair center:", error);
      setRecommendedRepairCenter(null);
      setShowRepairCenterDialog(true);
    }
  };

  const confirmRepairCenterAssignment = async () => {
    if (!recommendedRepairCenter) {
      toast({
        variant: "destructive",
        title: "No repair center available",
        description: "Please assign a repair center to this product first",
      });
      setShowRepairCenterDialog(false);
      return;
    }

    setUpdating(true);
    await updateTicketStatus(recommendedRepairCenter.id);
    setShowRepairCenterDialog(false);
  };

  const updateTicketStatus = async (repairCenterId?: string) => {
    setUpdating(true);

    try {
      const updateData: any = { status: newStatus as any };
      if (repairCenterId) {
        updateData.repair_center_id = repairCenterId;
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update(updateData)
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

  const handleUnclaimTicket = async () => {
    setClaiming(true);
    try {
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ assigned_to: null })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "UNASSIGNED",
        note: "Ticket unclaimed by staff member",
      });

      toast({
        title: "Ticket unclaimed",
        description: "You have unassigned yourself from this ticket",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error unclaiming ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unclaim ticket",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!window.confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) {
      return;
    }

    setCancelling(true);
    try {
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "CANCELLED" })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "CANCELLED",
        note: "Ticket cancelled by customer",
      });

      toast({
        title: "Ticket cancelled",
        description: "Your ticket has been cancelled",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel ticket",
      });
    } finally {
      setCancelling(false);
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

  const handleShippingLabel = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "SHIPPING" as any })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: "Shipping label requested - Status changed to SHIPPING",
      });

      toast({
        title: "Shipping label generated",
        description: "Your shipping label has been generated. The ticket is now in shipping status.",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error updating to shipping:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate shipping label",
      });
    } finally {
      setUpdating(false);
    }
  };

  const canUpdateStatus = userRole === "STAFF" || userRole === "ADMIN" || userRole === "STAFF_MANAGER";
  const canCancelTicket = 
    userRole === "CUSTOMER" && 
    ticket.owner_id === user?.id && 
    (ticket.status === "OPEN" || ticket.status === "UNDER_REVIEW");

  // Calculate SLA status
  const getSLAStatus = () => {
    if (!ticket.sla_due_at) return null;
    
    const now = new Date();
    const dueDate = new Date(ticket.sla_due_at);
    const hoursRemaining = differenceInHours(dueDate, now);
    
    if (hoursRemaining < 0) {
      return { label: "Overdue", className: "text-destructive", hours: Math.abs(hoursRemaining) };
    } else if (hoursRemaining < 4) {
      return { label: "Due Soon", className: "text-amber-600 dark:text-amber-400", hours: hoursRemaining };
    } else {
      return { label: "On Track", className: "text-success", hours: hoursRemaining };
    }
  };

  const slaStatus = getSLAStatus();

  const handlePriorityUpdate = async () => {
    if (newPriority === ticket.priority) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ priority: newPriority as any })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: `Priority changed to ${newPriority}`,
      });

      toast({
        title: "Priority updated",
        description: "Ticket priority has been updated successfully",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update priority",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRepairCenterUpdate = async () => {
    if (selectedRepairCenter === ticket.repair_center_id) return;

    setUpdating(true);
    try {
      const newRepairCenterId = selectedRepairCenter === "unassigned" ? null : selectedRepairCenter;
      const repairCenter = repairCenters.find(rc => rc.id === newRepairCenterId);
      
      const { error } = await supabase
        .from("tickets")
        .update({ repair_center_id: newRepairCenterId })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("ticket_events").insert({
        ticket_id: id,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: repairCenter 
          ? `Repair center changed to ${repairCenter.name}` 
          : "Repair center assignment removed",
      });

      toast({
        title: "Repair center updated",
        description: "Ticket repair center has been updated successfully",
      });

      loadTicketDetails();
    } catch (error) {
      console.error("Error updating repair center:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update repair center",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
              <StatusBadge status={ticket.status} />
              {userRole !== "CUSTOMER" && <PriorityBadge priority={ticket.priority || "NORMAL"} />}
              <Badge variant={ticket.ticket_type === "RETURN" ? "destructive" : "default"}>
                {ticket.ticket_type === "RETURN" ? "Return Request" : "Repair Request"}
              </Badge>
              {ticket.ticket_type === "RETURN" && ticket.purchase_date && (
                <Badge className="bg-success text-success-foreground">
                  Within 15 days of purchase
                </Badge>
              )}
              {ticket.ticket_type === "REPAIR" && ticket.warranty_eligible && (
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
            {/* Shipping Label Button for Customers */}
            {userRole === "CUSTOMER" && 
             ticket.ticket_type === "REPAIR" && 
             ticket.warranty_eligible && 
             ticket.status === "OPEN" && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Ready to Ship?</h3>
                      <p className="text-sm text-muted-foreground">
                        Download your shipping label and send your device for repair
                      </p>
                    </div>
                    <Button onClick={handleShippingLabel} disabled={updating}>
                      <Download className="h-4 w-4 mr-2" />
                      {updating ? "Generating..." : "Get Shipping Label"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback Prompt for Closed/Rejected Tickets */}
            {userRole === "CUSTOMER" && 
             (ticket.status === "CLOSED" || ticket.status === "REJECTED") && 
             !hasFeedback && (
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">How was your experience?</h3>
                      <p className="text-sm text-muted-foreground">
                        We'd love to hear your feedback on this ticket
                      </p>
                    </div>
                    <Button onClick={() => setShowFeedbackDialog(true)} variant="default">
                      Leave Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  {ticket.repair_centers && userRole !== "CUSTOMER" && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Repair Center</p>
                        <p className="font-medium">{ticket.repair_centers.name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.repair_centers.region}</p>
                        <p className="text-xs text-muted-foreground">{ticket.repair_centers.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Issue Description</p>
                  <p className="whitespace-pre-wrap">{ticket.issue}</p>
                </div>

                {/* Product Photos */}
                {ticket.photos && Array.isArray(ticket.photos) && ticket.photos.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">Product Photos ({ticket.photos.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ticket.photos.map((photoUrl: string, index: number) => (
                        <a 
                          key={index} 
                          href={photoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                        >
                          <img 
                            src={photoUrl} 
                            alt={`Product photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            <TicketAttachments ticketId={id!} />

            {/* Comments Section */}
            <TicketComments ticketId={id!} />

            {/* Status Timeline for Customers */}
            {userRole === "CUSTOMER" && (
              <TicketStatusTimeline events={events} currentStatus={ticket.status} />
            )}

            {/* Event Timeline */}
            {(userRole === "STAFF" || userRole === "ADMIN" || userRole === "REPAIR_CENTER") && (
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
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SLA Status Card */}
            {canUpdateStatus && slaStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    SLA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className={`font-semibold ${slaStatus.className}`}>
                      {slaStatus.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {slaStatus.hours < 0 ? "Overdue by" : "Time remaining"}
                    </p>
                    <p className="font-medium">{Math.abs(Math.round(slaStatus.hours))} hours</p>
                  </div>
                  {ticket.sla_due_at && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Due date</p>
                      <p className="font-medium">
                        {format(new Date(ticket.sla_due_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {canUpdateStatus && (
              <>
                {/* Assignment Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticket.assigned_staff ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Assigned to</p>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{ticket.assigned_staff.full_name}</p>
                          </div>
                        </div>
                        {ticket.assigned_to === user?.id && (
                          <Button
                            onClick={handleUnclaimTicket}
                            disabled={claiming}
                            className="w-full"
                            variant="outline"
                            size="sm"
                          >
                            {claiming ? "Unclaiming..." : "Unclaim Ticket"}
                          </Button>
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

                {/* Priority Management Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Priority Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select value={newPriority} onValueChange={setNewPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low Priority</SelectItem>
                          <SelectItem value="NORMAL">Normal Priority</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handlePriorityUpdate}
                      disabled={updating || newPriority === ticket.priority}
                      className="w-full"
                      variant="secondary"
                    >
                      {updating ? "Updating..." : "Update Priority"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Repair Center Management Card */}
                {ticket.ticket_type === "REPAIR" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Repair Center Assignment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Assigned Repair Center</Label>
                        <Select value={selectedRepairCenter} onValueChange={setSelectedRepairCenter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select repair center" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {repairCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name} - {center.region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {ticket.repair_centers && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                          <p className="font-medium mb-1">Current: {ticket.repair_centers.name}</p>
                          <p className="text-xs text-muted-foreground">{ticket.repair_centers.region}</p>
                          <p className="text-xs text-muted-foreground">{ticket.repair_centers.email}</p>
                        </div>
                      )}
                      <Button
                        onClick={handleRepairCenterUpdate}
                        disabled={updating || selectedRepairCenter === (ticket.repair_center_id || "unassigned")}
                        className="w-full"
                        variant="secondary"
                      >
                        {updating ? "Updating..." : "Update Repair Center"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

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
                        <SelectItem value="SHIPPING">Shipping</SelectItem>
                        <SelectItem value="PRODUCT_EVALUATION">Product Evaluation</SelectItem>
                        <SelectItem value="REPLACEMENT_INITIATED">Replacement Initiated</SelectItem>
                        {ticket.ticket_type !== "RETURN" && (
                          <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                        )}
                        <SelectItem value="REPAIR_COMPLETED">Repair Completed</SelectItem>
                        <SelectItem value="SHIPPED_TO_CUSTOMER">Shipped to Customer</SelectItem>
                        <SelectItem value="AWAITING_CUSTOMER">Awaiting Customer</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
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

            {/* Repair Center Decision (for repair centers only) */}
            {userRole === "REPAIR_CENTER" && ticket.status === "IN_REPAIR" && ticket.ticket_type === "REPAIR" && (
              <Card>
                <CardHeader>
                  <CardTitle>Repair Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Decision</Label>
                    <Select 
                      value={ticket.decision_by_repair_center || ""} 
                      onValueChange={async (value) => {
                        try {
                          const { error } = await supabase
                            .from("tickets")
                            .update({ 
                              decision_by_repair_center: value,
                              status: value === "Replace" ? "REPLACEMENT_APPROVED" : ticket.status
                            })
                            .eq("id", id);

                          if (error) throw error;

                          await supabase.from("ticket_events").insert({
                            ticket_id: id,
                            by_user_id: user?.id,
                            type: "REPAIR_DECISION",
                            note: `Repair center decided: ${value}`,
                          });

                          toast({
                            title: "Decision recorded",
                            description: `You have chosen to ${value.toLowerCase()} this product`,
                          });

                          loadTicketDetails();
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Failed to record decision",
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select repair decision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Repair">Repair Product</SelectItem>
                        <SelectItem value="Replace">Replace Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to repair or replace the faulty product based on the damage assessment.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Customer Cancel Button */}
            {canCancelTicket && (
              <Card>
                <CardHeader>
                  <CardTitle>Cancel Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can cancel this ticket while it's still in Open or Under Review status.
                  </p>
                  <Button
                    onClick={handleCancelTicket}
                    disabled={cancelling}
                    variant="destructive"
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {cancelling ? "Cancelling..." : "Cancel Ticket"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {ticket.status === "IN_REPAIR" && ticket.repair_centers && (
              <Card>
                <CardHeader>
                  <CardTitle>Repair Center</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Center Name</p>
                    <p className="font-medium">{ticket.repair_centers.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{ticket.repair_centers.region}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{ticket.repair_centers.email}</p>
                  </div>
                  {ticket.repair_status && (
                    <div>
                      <p className="text-sm text-muted-foreground">Repair Status</p>
                      <Badge variant="outline" className="mt-1">
                        {ticket.repair_status.replace("_", " ")}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
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

        <RepairCenterDialog
          open={showRepairCenterDialog}
          onOpenChange={setShowRepairCenterDialog}
          repairCenter={recommendedRepairCenter}
          productName={ticket?.products?.name || ""}
          onConfirm={confirmRepairCenterAssignment}
          loading={updating}
        />
        
        <FeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={(open) => {
            setShowFeedbackDialog(open);
            if (!open) checkFeedback(); // Refresh feedback status
          }}
          ticketId={id || ""}
          ticketNumber={ticket?.ticket_number || 0}
          userId={user?.id || ""}
        />
      </div>
    </Layout>
  );
}
