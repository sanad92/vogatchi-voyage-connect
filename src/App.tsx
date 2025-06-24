import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Auth from "@/pages/Auth";
import OptimizedIndex from "@/pages/OptimizedIndex";
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
import WhatsApp from "@/pages/WhatsApp";
import WhatsAppAdmin from '@/pages/WhatsAppAdmin';
import { useOptimizedAuth, OptimizedAuthProvider } from "@/hooks/useOptimizedAuth";
import Navbar from "@/components/navbar/Navbar";
import EnhancedErrorBoundary from "@/components/common/EnhancedErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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
      <OptimizedAuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="flex">
                      <Navbar />
                      <main className="flex-1">
                        <EnhancedErrorBoundary
                          fallback={
                            <div className="p-6">
                              <Alert className="border-red-200 bg-red-50">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                  حدث خطأ في تحميل الصفحة. يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً.
                                </AlertDescription>
                              </Alert>
                            </div>
                          }
                        >
                          <Routes>
                            <Route path="/" element={<OptimizedIndex />} />
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
                            <Route path="/whatsapp-admin" element={<WhatsAppAdmin />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </EnhancedErrorBoundary>
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </OptimizedAuthProvider>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isLoggedIn, loading, user } = useOptimizedAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />;
  }

  if (!user?.email) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default App;
