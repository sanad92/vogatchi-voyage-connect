
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import PaymentOrders from "./pages/PaymentOrders";
import CustomerService from "./pages/CustomerService";
import DailyOperations from "./pages/DailyOperations";
import AdminSettings from "./pages/AdminSettings";
import HotelBookings from "./pages/HotelBookings";
import FlightBookings from "./pages/FlightBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <Index />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/daily-operations" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <DailyOperations />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <Customers />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/hotel-bookings" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <HotelBookings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/flight-bookings" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <FlightBookings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <Suppliers />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <Reports />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <Invoices />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/payment-orders" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <PaymentOrders />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/customer-service" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <CustomerService />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="pt-16">
                  <AdminSettings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
