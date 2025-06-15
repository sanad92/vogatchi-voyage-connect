import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Customers from "./pages/Customers";
import CustomerService from "./pages/CustomerService";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import BankAccounts from "./pages/BankAccounts";
import PaymentOrders from "./pages/PaymentOrders";
import FlightBookings from "./pages/FlightBookings";
import HotelBookings from "./pages/HotelBookings";
import DailyOperations from "./pages/DailyOperations";
import AdminSettings from "./pages/AdminSettings";
import NewHotelBooking from "./pages/NewHotelBooking";
import NewCustomer from "./pages/NewCustomer";
import BookingsCalendar from "./pages/BookingsCalendar";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import CRMDashboard from "./pages/CRMDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Navbar />
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <Navbar />
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="/new-customer" element={
              <ProtectedRoute>
                <Navbar />
                <NewCustomer />
              </ProtectedRoute>
            } />
            <Route path="/crm" element={
              <ProtectedRoute>
                <Navbar />
                <CRMDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer-service" element={
              <ProtectedRoute>
                <CustomerService />
              </ProtectedRoute>
            } />
            <Route path="/daily-operations" element={
              <ProtectedRoute>
                <DailyOperations />
              </ProtectedRoute>
            } />
            <Route path="/flight-bookings" element={
              <ProtectedRoute>
                <Navbar />
                <FlightBookings />
              </ProtectedRoute>
            } />
            <Route path="/hotel-bookings" element={
              <ProtectedRoute>
                <Navbar />
                <HotelBookings />
              </ProtectedRoute>
            } />
            <Route path="/new-hotel-booking" element={
              <ProtectedRoute>
                <Navbar />
                <NewHotelBooking />
              </ProtectedRoute>
            } />
            <Route path="/bookings-calendar" element={
              <ProtectedRoute>
                <Navbar />
                <BookingsCalendar />
              </ProtectedRoute>
            } />
            <Route path="/invoices" element={
              <ProtectedRoute>
                <Navbar />
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Navbar />
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/suppliers" element={
              <ProtectedRoute>
                <Navbar />
                <Suppliers />
              </ProtectedRoute>
            } />
            <Route path="/bank-accounts" element={
              <ProtectedRoute>
                <Navbar />
                <BankAccounts />
              </ProtectedRoute>
            } />
            <Route path="/payment-orders" element={
              <ProtectedRoute>
                <Navbar />
                <PaymentOrders />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Navbar />
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
