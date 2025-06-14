
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Customers from "./pages/Customers";
import Employees from "./pages/Employees";
import Invoices from "./pages/Invoices";
import WhatsApp from "./pages/WhatsApp";
import Reports from "./pages/Reports";
import Trips from "./pages/Trips";
import Suppliers from "./pages/Suppliers";
import Bookings from "./pages/Bookings";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute requiredRole="sales_agent">
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute requiredRole="manager">
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="/invoices" element={
              <ProtectedRoute requiredRole="accountant">
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/suppliers" element={
              <ProtectedRoute requiredRole="manager">
                <Suppliers />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute requiredRole="sales_agent">
                <Bookings />
              </ProtectedRoute>
            } />
            <Route path="/whatsapp" element={
              <ProtectedRoute requiredRole="sales_agent">
                <WhatsApp />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="viewer">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/trips" element={
              <ProtectedRoute requiredRole="viewer">
                <Trips />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
