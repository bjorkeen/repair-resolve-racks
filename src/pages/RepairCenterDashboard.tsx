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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Package, Calendar, Hash, AlertCircle, Upload, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketAttachments } from "@/components/TicketAttachments";
import { Textarea } from "@/components/ui/textarea";

export default function RepairCenterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairCenter, setRepairCenter] = useState<any>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});

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

      // Load tickets - show all tickets assigned to this repair center
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku),
          assigned_staff:profiles!tickets_assigned_to_fkey (full_name)
        `)
        .eq("repair_center_id", centerData.id)
        .in("status", ["IN_REPAIR", "PRODUCT_EVALUATION", "REPLACEMENT_INITIATED", "REPAIR_COMPLETED"])
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

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus as any })
        .eq("id", ticketId);

      if (error) throw error;

      // Create event
      await supabase.from("ticket_events").insert({
        ticket_id: ticketId,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: `Status changed to ${newStatus.replace(/_/g, " ")}`,
      });

      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully",
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

  const updateEstimatedDate = async (ticketId: string, date: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ estimated_completion_date: date })
        .eq("id", ticketId);

      if (error) throw error;

      await supabase.from("ticket_events").insert({
        ticket_id: ticketId,
        by_user_id: user?.id,
        type: "STATUS_CHANGED",
        note: `Estimated completion date set to ${format(new Date(date), "MMM d, yyyy")}`,
      });

      toast({
        title: "Date updated",
        description: "Estimated completion date has been set",
      });

      loadData();
    } catch (error) {
      console.error("Error updating date:", error);
      toast({
        variant: "destructive",
        title: "Error updating date",
      });
    }
  };

  const handleFileUpload = async (ticketId: string, files: FileList) => {
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${ticketId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        await supabase.from("ticket_attachments").insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        });
      }

      toast({
        title: "Files uploaded",
        description: "Repair notes and attachments have been added",
      });

      loadData();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        variant: "destructive",
        title: "Error uploading files",
      });
    }
  };

  const addInternalComment = async (ticketId: string) => {
    const comment = newComment[ticketId]?.trim();
    if (!comment) return;

    try {
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        user_id: user?.id,
        comment: comment,
        is_internal: true,
      });

      if (error) throw error;

      toast({
        title: "Comment added",
        description: "Internal comment has been added successfully",
      });

      setNewComment({ ...newComment, [ticketId]: "" });
      loadData();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error adding comment",
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

                  <div className="pt-4 border-t">
                    <TicketAttachments ticketId={ticket.id} />
                  </div>

                  <div className="flex flex-col gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Update Ticket Status:</label>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRODUCT_EVALUATION">Product Evaluation</SelectItem>
                          <SelectItem value="REPLACEMENT_INITIATED">Replacement Initiated</SelectItem>
                          <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                          <SelectItem value="REPAIR_COMPLETED">Repair Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estimated Completion Date:</label>
                      <Input
                        type="date"
                        className="w-full"
                        value={ticket.estimated_completion_date ? format(new Date(ticket.estimated_completion_date), "yyyy-MM-dd") : ""}
                        onChange={(e) => updateEstimatedDate(ticket.id, e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Upload Repair Documents:</label>
                      <Input
                        type="file"
                        className="w-full"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => e.target.files && handleFileUpload(ticket.id, e.target.files)}
                      />
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Add Internal Comment (visible to staff only):
                      </label>
                      <Textarea
                        placeholder="Enter internal notes or comments..."
                        value={newComment[ticket.id] || ""}
                        onChange={(e) => setNewComment({ ...newComment, [ticket.id]: e.target.value })}
                        className="min-h-[80px]"
                      />
                      <Button
                        onClick={() => addInternalComment(ticket.id)}
                        disabled={!newComment[ticket.id]?.trim()}
                        variant="secondary"
                        className="w-full"
                      >
                        Add Comment
                      </Button>
                    </div>
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
