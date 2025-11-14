import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Package,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  product_id?: string;
  ticket_id?: string;
  repair_center_id?: string;
  metric_value?: number;
  threshold?: number;
  status: string;
  created_at: string;
  products?: { name: string; sku: string };
  tickets?: { ticket_number: number };
  repair_centers?: { name: string };
}

export default function ManagerDashboard() {
  const [kpis, setKpis] = useState({
    openTickets: 0,
    inRepair: 0,
    overdueRepairs: 0,
    alertsOpen: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [topFaultyProducts, setTopFaultyProducts] = useState<any[]>([]);
  const [repairCenterPerformance, setRepairCenterPerformance] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Dialog states
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, statusFilter, severityFilter, typeFilter]);

  const loadDashboardData = async () => {
    try {
      // Load metrics
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const response = await supabase.functions.invoke('manager-api/metrics', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.data?.data) {
        setKpis(response.data.data.kpis);
        setTopFaultyProducts(response.data.data.topFaultyProducts);
        setRepairCenterPerformance(response.data.data.repairCenterPerformance);
      }

      // Load alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('*, products(name, sku), tickets(ticket_number), repair_centers(name)')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Load trends
      const trendsResponse = await supabase.functions.invoke('manager-api/trends', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (trendsResponse.data?.data) {
        setDailyTrend(trendsResponse.data.data.dailyTrend);
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    if (severityFilter !== "all") {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(a => a.type === typeFilter);
    }
    
    setFilteredAlerts(filtered);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke(`manager-api/alerts/${alertId}/ack`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      toast.success("Alert acknowledged");
      loadDashboardData();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const openResolveDialog = (alert: Alert) => {
    setSelectedAlert(alert);
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke(`manager-api/alerts/${selectedAlert.id}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          resolutionNote,
        },
      });

      toast.success("Alert resolved");
      setResolveDialogOpen(false);
      setResolutionNote("");
      loadDashboardData();
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return <Badge variant="destructive">High</Badge>;
      case "MEDIUM":
        return <Badge className="bg-orange-500">Medium</Badge>;
      case "LOW":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive">Open</Badge>;
      case "ACKNOWLEDGED":
        return <Badge className="bg-yellow-500">Acknowledged</Badge>;
      case "RESOLVED":
        return <Badge variant="secondary">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Staff Manager Dashboard</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.openTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Repair</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.inRepair}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Repairs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{kpis.overdueRepairs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{kpis.alertsOpen}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alerts</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="HIGH_FAULT_RATE_PER_PRODUCT">High Fault Rate</SelectItem>
                    <SelectItem value="DELAYED_REPAIRS">Delayed Repairs</SelectItem>
                    <SelectItem value="HIGH_RETURN_RATE">High Return Rate</SelectItem>
                    <SelectItem value="REPAIR_CENTER_UNDERPERFORMANCE">Center Underperformance</SelectItem>
                    <SelectItem value="DUPLICATE_SERIAL_CLAIMS">Duplicate Claims</SelectItem>
                    <SelectItem value="OUT_OF_WARRANTY_SPIKE">Warranty Spike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell className="max-w-md">{alert.description}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {alert.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== "RESOLVED" && (
                            <Button
                              size="sm"
                              onClick={() => openResolveDialog(alert)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Faulty Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Faulty Products (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {topFaultyProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topFaultyProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sku" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Faulty Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-12">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Ticket Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" name="Created" />
                    <Line type="monotone" dataKey="resolved" stroke="hsl(var(--secondary))" name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-12">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Repair Center Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Center Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Resolved %</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Avg Repair Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairCenterPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  repairCenterPerformance.map((center) => (
                    <TableRow key={center.centerId}>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell>{center.assigned}</TableCell>
                      <TableCell>
                        <span className={center.resolvedRatio < 0.7 ? "text-destructive" : ""}>
                          {(center.resolvedRatio * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={center.overdue > 0 ? "text-destructive" : ""}>
                          {center.overdue}
                        </span>
                      </TableCell>
                      <TableCell>{center.avgRepairDays.toFixed(1)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Alert</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedAlert?.title}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution-note">Resolution Note (Optional)</Label>
                <Textarea
                  id="resolution-note"
                  placeholder="Add notes about how this alert was resolved..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolve}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
