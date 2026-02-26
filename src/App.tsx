
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SaaSLanding from "@/pages/SaaSLanding";
import PricingPage from "@/pages/PricingPage";
import PaymentPage from "@/pages/PaymentPage";
import OptimizedIndex from "@/pages/OptimizedIndex";
import MonitoringDashboard from "@/pages/MonitoringDashboard";
import AdminRouteGuard from "@/components/guards/AdminRouteGuard";
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
import TeamManagement from "@/pages/TeamManagement";
import NotFound from "@/pages/NotFound";
import WhatsApp from "@/pages/WhatsApp";
import WhatsAppAdmin from '@/pages/WhatsAppAdmin';
import SupabaseProtectedRoute from "@/components/SupabaseProtectedRoute";
import { OptimizedAuthProvider } from "@/hooks/useOptimizedAuth";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";
import CMSPages from "@/pages/admin/CMSPages";
import PageBlocks from "@/pages/admin/PageBlocks";
import AuthPage from "@/components/auth/AuthPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import RegisterOrganization from "@/pages/RegisterOrganization";
import OnboardingWizard from "@/pages/OnboardingWizard";
import AcceptInvite from "@/pages/AcceptInvite";
import PlatformAdminDashboard from "@/pages/platform-admin/PlatformAdminDashboard";
import PlatformAdminOrganizations from "@/pages/platform-admin/PlatformAdminOrganizations";
import PlatformAdminGuard from "@/components/platform-admin/PlatformAdminGuard";
import SubscriptionExpiredPage from "@/pages/SubscriptionExpired";
import SubscriptionManagement from "@/pages/SubscriptionManagement";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import SubscriptionRedirectGuard from "@/components/subscription/SubscriptionRedirectGuard";
import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

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
        <OptimizedAuthProvider>
          <OrganizationProvider>
          <OptimizedErrorBoundary>
            <div className="min-h-screen bg-background">
              <Toaster position="top-right" />
              <Routes>
                {/* صفحة الهبوط التسويقية */}
                <Route path="/" element={<SaaSLanding />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/register-organization" element={
                  <SupabaseProtectedRoute>
                    <RegisterOrganization />
                  </SupabaseProtectedRoute>
                } />
                <Route path="/onboarding" element={
                  <SupabaseProtectedRoute>
                    <OnboardingWizard />
                  </SupabaseProtectedRoute>
                } />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                {/* Platform Admin routes */}
                <Route path="/platform-admin" element={
                  <PlatformAdminGuard><PlatformAdminDashboard /></PlatformAdminGuard>
                } />
                <Route path="/platform-admin/organizations" element={
                  <PlatformAdminGuard><PlatformAdminOrganizations /></PlatformAdminGuard>
                } />
                
                {/* صفحات النظام المحمية */}
                <Route
                  path="/*"
                  element={
                  <SupabaseProtectedRoute>
                    <SubscriptionProvider>
                    <OnboardingGuard>
                    <DashboardLayout>
                        <SubscriptionBanner />
                        <OptimizedErrorBoundary>
                          <SubscriptionRedirectGuard>
                          <Routes>
                              <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />
                              <Route path="/subscription" element={<SubscriptionManagement />} />
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
                              <Route path="/admin-settings" element={<AdminRouteGuard><AdminSettings /></AdminRouteGuard>} />
                              <Route path="/landing-admin" element={<AdminRouteGuard><AdminSettings /></AdminRouteGuard>} />
                              <Route path="/admin-import-export" element={<AdminRouteGuard><AdminImportExport /></AdminRouteGuard>} />
                              <Route path="/site-customization" element={<AdminRouteGuard><SiteCustomization /></AdminRouteGuard>} />
                              <Route path="/payment-orders" element={<PaymentOrders />} />
                              <Route path="/payment-success" element={<PaymentSuccess />} />
                              <Route path="/bank-accounts" element={<BankAccounts />} />
                              <Route path="/daily-operations" element={<DailyOperations />} />
                              <Route path="/customer-service" element={<CustomerService />} />
                              <Route path="/crm" element={<CRM />} />
                              <Route path="/crm-dashboard" element={<CRMDashboard />} />
                              <Route path="/customer-portal" element={<CustomerPortalPage />} />
                              <Route path="/bookings-calendar" element={<BookingsCalendar />} />
                              <Route path="/database-manager" element={<PlatformAdminGuard><DatabaseManager /></PlatformAdminGuard>} />
                              <Route path="/team" element={<AdminRouteGuard><TeamManagement /></AdminRouteGuard>} />
                              <Route path="/whatsapp" element={<WhatsApp />} />
                              <Route path="/whatsapp-admin" element={<AdminRouteGuard><WhatsAppAdmin /></AdminRouteGuard>} />
                              <Route path="/admin/cms" element={<AdminRouteGuard><CMSPages /></AdminRouteGuard>} />
                              <Route path="/admin/cms/pages/:id/blocks" element={<AdminRouteGuard><PageBlocks /></AdminRouteGuard>} />
                              <Route path="/monitoring" element={<AdminRouteGuard><MonitoringDashboard /></AdminRouteGuard>} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </SubscriptionRedirectGuard>
                        </OptimizedErrorBoundary>
                    </DashboardLayout>
                    </OnboardingGuard>
                    </SubscriptionProvider>
                  </SupabaseProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </OptimizedErrorBoundary>
          </OrganizationProvider>
          </OptimizedAuthProvider>
      </Router>
    </QueryClientProvider>
  );
}


export default App;
