import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState({
    open: 0,
    inRepair: 0,
    resolved: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, userRole]);

  const loadDashboardData = async () => {
    try {
      // Build query based on role
      let ticketsQuery = supabase
        .from("tickets")
        .select(`
          *,
          products (name, sku)
        `)
        .order("created_at", { ascending: false });

      // Customers only see their own tickets
      if (userRole === "CUSTOMER") {
        ticketsQuery = ticketsQuery.eq("owner_id", user?.id);
      }

      const { data: tickets } = await ticketsQuery;

      if (tickets) {
        // Calculate stats
        setStats({
          open: tickets.filter((t) => t.status === "OPEN").length,
          inRepair: tickets.filter((t) => t.status === "IN_REPAIR").length,
          resolved: tickets.filter((t) => t.status === "RESOLVED").length,
        });

        // Get recent tickets (last 5)
        setRecentTickets(tickets.slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your tickets.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-status-open" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Repair</CardTitle>
              <Clock className="h-4 w-4 text-status-repair" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inRepair}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently being fixed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-status-resolved" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Tickets</CardTitle>
              <Button asChild size="sm">
                <Link to="/tickets">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tickets yet</p>
                <Button asChild className="mt-4">
                  <Link to="/tickets/new">Create Your First Ticket</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="block border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{ticket.ticket_number}</span>
                          <StatusBadge status={ticket.status} />
                          {ticket.warranty_eligible && (
                            <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded">
                              Under Warranty
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ticket.products?.name} • {ticket.customer_name}
                        </p>
                        <p className="text-sm">{ticket.issue}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
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
