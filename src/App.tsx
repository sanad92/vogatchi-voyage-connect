
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Bookings from "@/pages/Bookings";
import Customers from "@/pages/Customers";
import Employees from "@/pages/Employees";
import Invoices from "@/pages/Invoices";
import CustomerPricing from "@/pages/CustomerPricing";
import PaymentOrders from "@/pages/PaymentOrders";
import Reports from "@/pages/Reports";
import Suppliers from "@/pages/Suppliers";
import Trips from "@/pages/Trips";
import WhatsApp from "@/pages/WhatsApp";
import CustomerService from "@/pages/CustomerService";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import "./App.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-service"
                element={
                  <ProtectedRoute>
                    <CustomerService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute>
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-pricing"
                element={
                  <ProtectedRoute>
                    <CustomerPricing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-orders"
                element={
                  <ProtectedRoute>
                    <PaymentOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute>
                    <Suppliers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trips"
                element={
                  <ProtectedRoute>
                    <Trips />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/whatsapp"
                element={
                  <ProtectedRoute>
                    <WhatsApp />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
