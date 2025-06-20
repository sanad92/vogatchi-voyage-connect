import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Customers from "@/pages/Customers";
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
import ExpenseManagement from "@/pages/ExpenseManagement";
import ExpenseManagementEnhanced from "@/pages/ExpenseManagementEnhanced";
import EmployeesPage from "@/pages/EmployeesPage";
import EnhancedEmployeesPage from "@/pages/EnhancedEmployeesPage";
import AdminSettings from "@/pages/AdminSettings";
import AdminImportExport from "@/pages/AdminImportExport";
import SiteCustomization from "@/pages/SiteCustomization";
import PaymentOrders from "@/pages/PaymentOrders";
import BankAccounts from "@/pages/BankAccounts";
import DailyOperations from "@/pages/DailyOperations";
import CustomerService from "@/pages/CustomerService";
import CRM from "@/pages/CRM";
import CRMDashboard from "@/pages/CRMDashboard";
import CustomerPortalPage from "@/pages/CustomerPortalPage";
import BookingsCalendar from "@/pages/BookingsCalendar";
import DatabaseManager from "@/pages/DatabaseManager";
import NotFound from "@/pages/NotFound";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import WhatsApp from "@/pages/WhatsApp";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex">
                    <Navbar />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/new-customer" element={<NewCustomer />} />
                        <Route path="/hotel-bookings" element={<HotelBookings />} />
                        <Route path="/new-hotel-booking" element={<NewHotelBooking />} />
                        <Route path="/flight-bookings" element={<FlightBookings />} />
                        <Route path="/new-flight-booking" element={<NewFlightBooking />} />
                        <Route path="/car-rentals" element={<CarRentals />} />
                        <Route path="/transport-bookings" element={<TransportBookings />} />
                        <Route path="/invoices" element={<Invoices />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/profit-loss-reports" element={<ProfitLossReports />} />
                        <Route path="/expense-management" element={<ExpenseManagement />} />
                        <Route path="/expense-management-enhanced" element={<ExpenseManagementEnhanced />} />
                        <Route path="/employees" element={<EmployeesPage />} />
                        <Route path="/employees-enhanced" element={<EnhancedEmployeesPage />} />
                        <Route path="/admin-settings" element={<AdminSettings />} />
                        <Route path="/admin-import-export" element={<AdminImportExport />} />
                        <Route path="/site-customization" element={<SiteCustomization />} />
                        <Route path="/payment-orders" element={<PaymentOrders />} />
                        <Route path="/bank-accounts" element={<BankAccounts />} />
                        <Route path="/daily-operations" element={<DailyOperations />} />
                        <Route path="/customer-service" element={<CustomerService />} />
                        <Route path="/crm" element={<CRM />} />
                        <Route path="/crm-dashboard" element={<CRMDashboard />} />
                        <Route path="/customer-portal" element={<CustomerPortalPage />} />
                        <Route path="/bookings-calendar" element={<BookingsCalendar />} />
                        <Route path="/database-manager" element={<DatabaseManager />} />
                        <Route path="/whatsapp" element={<WhatsApp />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Show a loading indicator while checking authentication
  }

  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

import Navbar from "@/components/navbar/Navbar";

export default App;
