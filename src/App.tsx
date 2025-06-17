
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Index from "@/pages/Index";
import Customers from "@/pages/Customers";
import NewCustomer from "@/pages/NewCustomer";
import HotelBookings from "@/pages/HotelBookings";
import NewHotelBooking from "@/pages/NewHotelBooking";
import FlightBookings from "@/pages/FlightBookings";
import NewFlightBooking from "@/pages/NewFlightBooking";
import TransportBookings from "@/pages/TransportBookings";
import CarRentals from "@/pages/CarRentals";
import Suppliers from "@/pages/Suppliers";
import ExpenseManagement from "@/pages/ExpenseManagement";
import BankAccounts from "@/pages/BankAccounts";
import Invoices from "@/pages/Invoices";
import Reports from "@/pages/Reports";
import AdminSettings from "@/pages/AdminSettings";
import DailyOperations from "@/pages/DailyOperations";
import CustomerService from "@/pages/CustomerService";
import CRM from "@/pages/CRM";
import EmployeesPage from "@/pages/EmployeesPage";
import NotFound from "@/components/NotFound";

const queryClient = new QueryClient();

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/daily-operations" element={<ProtectedRoute><DailyOperations /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/customers/new" element={<ProtectedRoute><NewCustomer /></ProtectedRoute>} />
                <Route path="/hotel-bookings" element={<ProtectedRoute><HotelBookings /></ProtectedRoute>} />
                <Route path="/hotel-bookings/new" element={<ProtectedRoute><NewHotelBooking /></ProtectedRoute>} />
                <Route path="/flight-bookings" element={<ProtectedRoute><FlightBookings /></ProtectedRoute>} />
                <Route path="/flight-bookings/new" element={<ProtectedRoute><NewFlightBooking /></ProtectedRoute>} />
                <Route path="/transport-bookings" element={<ProtectedRoute><TransportBookings /></ProtectedRoute>} />
                <Route path="/car-rentals" element={<ProtectedRoute><CarRentals /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
                <Route path="/expense-management" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />
                <Route path="/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/customer-service" element={<ProtectedRoute><CustomerService /></ProtectedRoute>} />
                <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
