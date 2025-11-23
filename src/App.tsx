import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";
import Policy from "./pages/Policy";
import NotFound from "./pages/NotFound";
import AdminRepairCenters from "./pages/admin/RepairCenters";
import AdminUserRoles from "./pages/admin/UserRoles";
import AdminWarrantyPolicies from "./pages/admin/WarrantyPolicies";
import AdminProducts from "./pages/admin/Products";
import AdminAnalytics from "./pages/admin/Analytics";
import RepairCenterDashboard from "./pages/RepairCenterDashboard";
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerFeedback from "./pages/manager/Feedback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/policy" element={<Policy />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute>
                  <NewTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetail />
                </ProtectedRoute>
              }
            />
            {/* Repair Center Routes */}
            <Route
              path="/repair-center"
              element={
                <ProtectedRoute allowedRoles={["REPAIR_CENTER"]}>
                  <RepairCenterDashboard />
                </ProtectedRoute>
              }
            />
            {/* Manager Routes */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={["STAFF_MANAGER", "ADMIN"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/feedback"
              element={
                <ProtectedRoute allowedRoles={["STAFF_MANAGER", "ADMIN"]}>
                  <ManagerFeedback />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin/repair-centers"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminRepairCenters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/user-roles"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminUserRoles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/warranty-policies"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminWarrantyPolicies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
