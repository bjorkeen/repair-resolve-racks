import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  Wrench,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface Stats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  totalUsers: number;
  totalProducts: number;
  repairCenters: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    totalUsers: 0,
    totalProducts: 0,
    repairCenters: 0,
  });
  const [ticketsByType, setTicketsByType] = useState<any[]>([]);
  const [ticketsByStatus, setTicketsByStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get all tickets
      const { data: tickets } = await supabase.from("tickets").select("*");

      // Get users count
      const { data: users } = await supabase.from("user_roles").select("*");

      // Get products count
      const { data: products } = await supabase.from("products").select("*");

      // Get repair centers count
      const { data: centers } = await supabase.from("repair_centers").select("*");

      // Calculate stats
      setStats({
        totalTickets: tickets?.length || 0,
        openTickets: tickets?.filter((t) => t.status === "OPEN").length || 0,
        resolvedTickets:
          tickets?.filter((t) => t.status === "RESOLVED").length || 0,
        totalUsers: users?.length || 0,
        totalProducts: products?.length || 0,
        repairCenters: centers?.length || 0,
      });

      // Tickets by type
      const repairCount =
        tickets?.filter((t) => t.ticket_type === "REPAIR").length || 0;
      const returnCount =
        tickets?.filter((t) => t.ticket_type === "RETURN").length || 0;
      setTicketsByType([
        { name: "Repair", value: repairCount },
        { name: "Return", value: returnCount },
      ]);

      // Tickets by status
      const statusData = [
        {
          name: "Open",
          value: tickets?.filter((t) => t.status === "OPEN").length || 0,
        },
        {
          name: "In Repair",
          value: tickets?.filter((t) => t.status === "IN_REPAIR").length || 0,
        },
        {
          name: "Resolved",
          value: tickets?.filter((t) => t.status === "RESOLVED").length || 0,
        },
      ];
      setTicketsByStatus(statusData);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))"];
  const STATUS_COLORS = [
    "hsl(var(--status-open))",
    "hsl(var(--status-repair))",
    "hsl(var(--status-resolved))",
  ];

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
          <h1 className="text-3xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Overview of system metrics and performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.openTickets} currently open
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">In catalog</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Repair Centers
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.repairCenters}</div>
              <p className="text-xs text-muted-foreground mt-1">Active locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-status-open" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.openTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Resolved Tickets
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-status-resolved" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.resolvedTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ticketsByType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {ticketsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
