import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Customers from "./pages/Customers";
import NewCustomer from "./pages/NewCustomer";
import HotelBookings from "./pages/HotelBookings";
import NewHotelBooking from "./pages/NewHotelBooking";
import FlightBookings from "./pages/FlightBookings";
import Suppliers from "./pages/Suppliers";
import Invoices from "./pages/Invoices";
import PaymentOrders from "./pages/PaymentOrders";
import BankAccounts from "./pages/BankAccounts";
import ExpenseManagement from "./pages/ExpenseManagement";
import Reports from "./pages/Reports";
import BookingsCalendar from "./pages/BookingsCalendar";
import DailyOperations from "./pages/DailyOperations";
import CRMDashboard from "./pages/CRMDashboard";
import CustomerService from "./pages/CustomerService";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import NewFlightBooking from "./pages/NewFlightBooking";
import ProfitLossReports from "./pages/ProfitLossReports";
import TransportBookings from "./pages/TransportBookings";
import CarRentals from "./pages/CarRentals";
import DatabaseManager from "./pages/DatabaseManager";
import EmployeesPage from '@/pages/EmployeesPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="flex flex-col min-h-screen">
                      <Navbar />
                      <main className="flex-1">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/daily-operations" element={<DailyOperations />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/customers/new" element={<NewCustomer />} />
                          <Route path="/hotel-bookings" element={<HotelBookings />} />
                          <Route path="/hotel-bookings/new" element={<NewHotelBooking />} />
                          <Route path="/flight-bookings" element={<FlightBookings />} />
                          <Route path="/flight-bookings/new" element={<NewFlightBooking />} />
                          <Route path="/transport-bookings" element={<TransportBookings />} />
                          <Route path="/car-rentals" element={<CarRentals />} />
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route path="/invoices" element={<Invoices />} />
                          <Route path="/payment-orders" element={<PaymentOrders />} />
                          <Route path="/bank-accounts" element={<BankAccounts />} />
                          <Route path="/expense-management" element={<ExpenseManagement />} />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/profit-loss-reports" element={<ProfitLossReports />} />
                          <Route path="/bookings-calendar" element={<BookingsCalendar />} />
                          <Route path="/crm" element={<CRMDashboard />} />
                          <Route path="/customer-service" element={<CustomerService />} />
                          <Route path="/admin" element={<AdminSettings />} />
                          <Route path="/admin/database" element={<DatabaseManager />} />
                          <Route path="/employees" element={<EmployeesPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
