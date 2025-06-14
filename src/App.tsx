
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Customers from "@/pages/Customers";
import Bookings from "@/pages/Bookings";
import HotelBookings from "@/pages/HotelBookings";
import Suppliers from "@/pages/Suppliers";
import Trips from "@/pages/Trips";
import Invoices from "@/pages/Invoices";
import PaymentOrders from "@/pages/PaymentOrders";
import CustomerPricing from "@/pages/CustomerPricing";
import Reports from "@/pages/Reports";
import Employees from "@/pages/Employees";
import WhatsApp from "@/pages/WhatsApp";
import CustomerService from "@/pages/CustomerService";
import DailyOperations from "@/pages/DailyOperations";
import AdminSettings from "@/pages/AdminSettings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/daily-operations" element={<ProtectedRoute><DailyOperations /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/hotel-bookings" element={<ProtectedRoute><HotelBookings /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/payment-orders" element={<ProtectedRoute><PaymentOrders /></ProtectedRoute>} />
            <Route path="/customer-pricing" element={<ProtectedRoute><CustomerPricing /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
            <Route path="/customer-service" element={<ProtectedRoute><CustomerService /></ProtectedRoute>} />
            <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
