
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import OptimizedIndex from "@/pages/OptimizedIndex";
import LandingPage from "@/pages/LandingPage";
import Customers from "@/pages/Customers";
import DuplicateCustomersPage from "@/pages/DuplicateCustomers";
import NewCustomer from "@/pages/NewCustomer";
import HotelBookings from "@/pages/HotelBookings";
import NewHotelBooking from "@/pages/NewHotelBooking";
import FlightBookings from "@/pages/FlightBookings";
import NewFlightBooking from "@/pages/NewFlightBooking";
import CarRentals from "@/pages/CarRentals";
import TransportBookings from "@/pages/TransportBookings";
import Invoices from "@/pages/Invoices";
import Suppliers from "@/pages/Suppliers";
import Reports from "@/pages/Reports";
import ProfitLossReports from "@/pages/ProfitLossReports";
import ExpenseManagementEnhanced from "@/pages/ExpenseManagementEnhanced";
import EnhancedEmployeesPage from "@/pages/EnhancedEmployeesPage";
import AdminSettings from "@/pages/AdminSettings";
import AdminImportExport from "@/pages/AdminImportExport";
import SiteCustomization from "@/pages/SiteCustomization";
import PaymentOrders from "@/pages/PaymentOrders";
import PaymentSuccess from "@/pages/PaymentSuccess";
import NewInvoice from "@/pages/NewInvoice";
import CustomerDetails from "@/pages/CustomerDetails";
import BankAccounts from "@/pages/BankAccounts";
import DailyOperations from "@/pages/DailyOperations";
import CustomerService from "@/pages/CustomerService";
import CRM from "@/pages/CRM";
import CRMDashboard from "@/pages/CRMDashboard";
import CustomerPortalPage from "@/pages/CustomerPortalPage";
import BookingsCalendar from "@/pages/BookingsCalendar";
import DatabaseManager from "@/pages/DatabaseManager";
import NotFound from "@/pages/NotFound";
import WhatsApp from "@/pages/WhatsApp";
import WhatsAppAdmin from '@/pages/WhatsAppAdmin';
import { SimpleAuthProvider } from "@/hooks/useSimpleAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/navbar/Navbar";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";
import BookingRequest from "@/pages/BookingRequest";
import CMSPages from "@/pages/admin/CMSPages";
import PageBlocks from "@/pages/admin/PageBlocks";
import DynamicPage from "@/pages/DynamicPage";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import BookingRequestStatic from "@/pages/BookingRequestStatic";
import AuthPage from "@/components/auth/AuthPage";

// إعدادات محسنة للQuery Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: false,
    }
  },
});

function App() {
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SimpleAuthProvider>
          <OptimizedErrorBoundary>
            <div className="min-h-screen bg-background">
              <Toaster position="top-right" />
              <Routes>
                {/* صفحة الهبوط كصفحة رئيسية ديناميكية */}
                <Route path="/" element={<DynamicPage />} />
                <Route path="/old-landing" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                
                {/* صفحات ثابتة مع fallback للـ CMS */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking-request" element={<BookingRequestStatic />} />
                
                <Route path="/landing" element={<Navigate to="/" replace />} />
                <Route path="/p/:slug" element={<DynamicPage />} />
                
                {/* صفحات النظام المحمية */}
                <Route
                  path="/*"
                  element={
                  <ProtectedRoute>
                    <div className="min-h-screen w-full">
                      <Navbar />
                      <main className="w-full">
                        <OptimizedErrorBoundary>
                          <Routes>
                              <Route path="/dashboard" element={<OptimizedIndex />} />
                              <Route path="/customers" element={<Customers />} />
                              <Route path="/duplicate-customers" element={<DuplicateCustomersPage />} />
                              <Route path="/new-customer" element={<NewCustomer />} />
                              <Route path="/hotel-bookings" element={<HotelBookings />} />
                              <Route path="/new-hotel-booking" element={<NewHotelBooking />} />
                              <Route path="/flight-bookings" element={<FlightBookings />} />
                              <Route path="/new-flight-booking" element={<NewFlightBooking />} />
                              <Route path="/car-rentals" element={<CarRentals />} />
                              <Route path="/transport-bookings" element={<TransportBookings />} />
                              <Route path="/invoices" element={<Invoices />} />
        <Route path="/new-invoice" element={<NewInvoice />} />
        <Route path="/customers/:customerId" element={<CustomerDetails />} />
                              <Route path="/suppliers" element={<Suppliers />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/profit-loss-reports" element={<ProfitLossReports />} />
                              <Route path="/expense-management" element={<ExpenseManagementEnhanced />} />
                              <Route path="/employees-enhanced" element={<EnhancedEmployeesPage />} />
                              <Route path="/admin-settings" element={<AdminSettings />} />
                              <Route path="/landing-admin" element={<AdminSettings />} />
                              <Route path="/admin-import-export" element={<AdminImportExport />} />
                              <Route path="/site-customization" element={<SiteCustomization />} />
                              <Route path="/payment-orders" element={<PaymentOrders />} />
                              <Route path="/payment-success" element={<PaymentSuccess />} />
                              <Route path="/bank-accounts" element={<BankAccounts />} />
                              <Route path="/daily-operations" element={<DailyOperations />} />
                              <Route path="/customer-service" element={<CustomerService />} />
                              <Route path="/crm" element={<CRM />} />
                              <Route path="/crm-dashboard" element={<CRMDashboard />} />
                              <Route path="/customer-portal" element={<CustomerPortalPage />} />
                              <Route path="/bookings-calendar" element={<BookingsCalendar />} />
                              <Route path="/database-manager" element={<DatabaseManager />} />
                              <Route path="/whatsapp" element={<WhatsApp />} />
                              <Route path="/whatsapp-admin" element={<WhatsAppAdmin />} />
                              <Route path="/admin/cms" element={<CMSPages />} />
                              <Route path="/admin/cms/pages/:id/blocks" element={<PageBlocks />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </OptimizedErrorBoundary>
                        </main>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </OptimizedErrorBoundary>
        </SimpleAuthProvider>
      </Router>
    </QueryClientProvider>
  );
}


export default App;
