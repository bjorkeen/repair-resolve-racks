import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Tickets() {
  const { user, userRole } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user, userRole]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, assignmentFilter]);

  const loadTickets = async () => {
    try {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku),
          assigned_staff:profiles!tickets_assigned_to_fkey (full_name, user_id)
        `)
        .order("created_at", { ascending: false });

      // Customers only see their own tickets
      if (userRole === "CUSTOMER") {
        query = query.eq("owner_id", user?.id);
      }

      const { data } = await query;
      setTickets(data || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Assignment filter (for staff/admin)
    if (assignmentFilter === "mine" && (userRole === "STAFF" || userRole === "ADMIN")) {
      filtered = filtered.filter((t) => t.assigned_to === user?.id);
    } else if (assignmentFilter === "unassigned" && (userRole === "STAFF" || userRole === "ADMIN")) {
      filtered = filtered.filter((t) => !t.assigned_to);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.ticket_number.toString().includes(query) ||
          t.customer_name.toLowerCase().includes(query) ||
          t.customer_email.toLowerCase().includes(query) ||
          t.serial_number.toLowerCase().includes(query)
      );
    }

    setFilteredTickets(filtered);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all support tickets
            </p>
          </div>
          <Button asChild>
            <Link to="/tickets/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket #, customer, or serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {(userRole === "STAFF" || userRole === "ADMIN") && (
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="mine">My Tickets</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                <SelectItem value="AWAITING_CUSTOMER">Awaiting Customer</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardContent className="p-0">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="block p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">#{ticket.ticket_number}</span>
                          <StatusBadge status={ticket.status} />
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            ticket.ticket_type === "RETURN" 
                              ? "bg-destructive text-destructive-foreground" 
                              : "bg-primary text-primary-foreground"
                          }`}>
                            {ticket.ticket_type === "RETURN" ? "Return" : "Repair"}
                          </span>
                          {ticket.warranty_eligible && (
                            <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded">
                              Under Warranty
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Product:</span>{" "}
                            <span className="font-medium">{ticket.products?.name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{" "}
                            <span className="font-medium">{ticket.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {userRole !== "CUSTOMER" ? "Assigned:" : "Serial:"}
                            </span>{" "}
                            <span className="font-medium">
                              {userRole !== "CUSTOMER" 
                                ? (ticket.assigned_staff?.full_name || "Unassigned")
                                : ticket.serial_number
                              }
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.issue}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(ticket.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
