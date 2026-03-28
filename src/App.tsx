
import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SupabaseProtectedRoute from "@/components/SupabaseProtectedRoute";
import { OptimizedAuthProvider } from "@/hooks/useOptimizedAuth";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";

import PermissionRouteGuard from "@/components/guards/PermissionRouteGuard";
import PlatformAdminGuard from "@/components/platform-admin/PlatformAdminGuard";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import SubscriptionRedirectGuard from "@/components/subscription/SubscriptionRedirectGuard";
import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
      <p className="mt-3 text-sm text-muted-foreground">جارٍ التحميل...</p>
    </div>
  </div>
);

// Public pages
const SaaSLanding = lazy(() => import("@/pages/SaaSLanding"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const PaymentPage = lazy(() => import("@/pages/PaymentPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const RegisterOrganization = lazy(() => import("@/pages/RegisterOrganization"));
const OnboardingWizard = lazy(() => import("@/pages/OnboardingWizard"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));

// Dashboard & Core
const OptimizedIndex = lazy(() => import("@/pages/OptimizedIndex"));
const Customers = lazy(() => import("@/pages/Customers"));
const DuplicateCustomersPage = lazy(() => import("@/pages/DuplicateCustomers"));
const NewCustomer = lazy(() => import("@/pages/NewCustomer"));
const CustomerDetails = lazy(() => import("@/pages/CustomerDetails"));

// Bookings (Legacy)
const HotelBookings = lazy(() => import("@/pages/HotelBookings"));
const NewHotelBooking = lazy(() => import("@/pages/NewHotelBooking"));
const FlightBookings = lazy(() => import("@/pages/FlightBookings"));
const NewFlightBooking = lazy(() => import("@/pages/NewFlightBooking"));
const CarRentals = lazy(() => import("@/pages/CarRentals"));
const TransportBookings = lazy(() => import("@/pages/TransportBookings"));

// Unified Bookings
const UnifiedBookings = lazy(() => import("@/pages/UnifiedBookings"));
const NewUnifiedBooking = lazy(() => import("@/pages/NewUnifiedBooking"));
const UnifiedBookingDetails = lazy(() => import("@/pages/UnifiedBookingDetails"));

// Quotes
const Quotes = lazy(() => import("@/pages/Quotes"));
const NewQuote = lazy(() => import("@/pages/NewQuote"));
const QuoteDetails = lazy(() => import("@/pages/QuoteDetails"));

// Finance
const Invoices = lazy(() => import("@/pages/Invoices"));
const NewInvoice = lazy(() => import("@/pages/NewInvoice"));
const PaymentOrders = lazy(() => import("@/pages/PaymentOrders"));
const BankAccounts = lazy(() => import("@/pages/BankAccounts"));
const ExpenseManagementEnhanced = lazy(() => import("@/pages/ExpenseManagementEnhanced"));
const ProfitAnalytics = lazy(() => import("@/pages/ProfitAnalytics"));
const ProfitLossReports = lazy(() => import("@/pages/ProfitLossReports"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));

// Operations
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const Reports = lazy(() => import("@/pages/Reports"));
const EnhancedEmployeesPage = lazy(() => import("@/pages/EnhancedEmployeesPage"));
const DailyOperations = lazy(() => import("@/pages/DailyOperations"));
const CustomerService = lazy(() => import("@/pages/CustomerService"));
const BookingsCalendar = lazy(() => import("@/pages/BookingsCalendar"));

// CRM
const CRM = lazy(() => import("@/pages/CRM"));
const CRMDashboard = lazy(() => import("@/pages/CRMDashboard"));
const CustomerPortalPage = lazy(() => import("@/pages/CustomerPortalPage"));

// Communication
const WhatsApp = lazy(() => import("@/pages/WhatsApp"));
const WhatsAppAdmin = lazy(() => import("@/pages/WhatsAppAdmin"));

// Admin
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const AdminImportExport = lazy(() => import("@/pages/AdminImportExport"));
const SiteCustomization = lazy(() => import("@/pages/SiteCustomization"));
const MonitoringDashboard = lazy(() => import("@/pages/MonitoringDashboard"));
const DatabaseManager = lazy(() => import("@/pages/DatabaseManager"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const AutomationRules = lazy(() => import("@/pages/AutomationRules"));
const Documents = lazy(() => import("@/pages/Documents"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const CMSPages = lazy(() => import("@/pages/admin/CMSPages"));
const PageBlocks = lazy(() => import("@/pages/admin/PageBlocks"));

// Platform Admin
const PlatformAdminDashboard = lazy(() => import("@/pages/platform-admin/PlatformAdminDashboard"));
const PlatformAdminOrganizations = lazy(() => import("@/pages/platform-admin/PlatformAdminOrganizations"));
const PlatformAdminSubscriptions = lazy(() => import("@/pages/platform-admin/PlatformAdminSubscriptions"));

// Subscription
const SubscriptionExpiredPage = lazy(() => import("@/pages/SubscriptionExpired"));
const SubscriptionManagement = lazy(() => import("@/pages/SubscriptionManagement"));

const NotFound = lazy(() => import("@/pages/NotFound"));

// Query Client
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
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<SaaSLanding />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/create-organization" element={
                  <SupabaseProtectedRoute><RegisterOrganization /></SupabaseProtectedRoute>
                } />
                <Route path="/register-organization" element={
                  <SupabaseProtectedRoute><RegisterOrganization /></SupabaseProtectedRoute>
                } />
                <Route path="/onboarding" element={
                  <SupabaseProtectedRoute><OnboardingWizard /></SupabaseProtectedRoute>
                } />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                {/* Protected */}
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
                          <Suspense fallback={<PageLoader />}>
                          <Routes>
                              <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />
                              <Route path="/subscription" element={<SubscriptionManagement />} />
                              <Route path="/dashboard" element={<OptimizedIndex />} />
                              <Route path="/customers" element={<Customers />} />
                              <Route path="/duplicate-customers" element={<DuplicateCustomersPage />} />
                              <Route path="/new-customer" element={<NewCustomer />} />
                              <Route path="/hotel-bookings" element={<HotelBookings />} />
                              <Route path="/quotes" element={<Quotes />} />
                              <Route path="/quotes/new" element={<NewQuote />} />
                              <Route path="/quotes/:id" element={<QuoteDetails />} />
                              <Route path="/new-hotel-booking" element={<NewHotelBooking />} />
                              <Route path="/flight-bookings" element={<FlightBookings />} />
                              <Route path="/new-flight-booking" element={<NewFlightBooking />} />
                              <Route path="/car-rentals" element={<CarRentals />} />
                              <Route path="/transport-bookings" element={<TransportBookings />} />
                              <Route path="/invoices" element={<Invoices />} />
                              <Route path="/new-invoice" element={<NewInvoice />} />
                              <Route path="/customers/:customerId" element={<CustomerDetails />} />
                              <Route path="/suppliers" element={<PermissionRouteGuard requiredPermission="suppliers_view"><Suppliers /></PermissionRouteGuard>} />
                              <Route path="/reports" element={<PermissionRouteGuard requiredPermission="reports_view"><Reports /></PermissionRouteGuard>} />
                              <Route path="/profit-loss-reports" element={<PermissionRouteGuard requiredPermission="reports_view"><ProfitLossReports /></PermissionRouteGuard>} />
                              <Route path="/profit-analytics" element={<PermissionRouteGuard requiredPermission="reports_advanced"><ProfitAnalytics /></PermissionRouteGuard>} />
                              <Route path="/expense-management" element={<PermissionRouteGuard requiredPermission="expenses_view"><ExpenseManagementEnhanced /></PermissionRouteGuard>} />
                              <Route path="/employees-enhanced" element={<PermissionRouteGuard requiredPermission="employees_view"><EnhancedEmployeesPage /></PermissionRouteGuard>} />
                              <Route path="/admin-settings" element={<AdminRouteGuard><AdminSettings /></AdminRouteGuard>} />
                              <Route path="/landing-admin" element={<AdminRouteGuard><AdminSettings /></AdminRouteGuard>} />
                              <Route path="/admin-import-export" element={<AdminRouteGuard><AdminImportExport /></AdminRouteGuard>} />
                              <Route path="/site-customization" element={<AdminRouteGuard><SiteCustomization /></AdminRouteGuard>} />
                              <Route path="/payment-orders" element={<PermissionRouteGuard requiredPermission="financial_view"><PaymentOrders /></PermissionRouteGuard>} />
                              <Route path="/payment-success" element={<PaymentSuccess />} />
                              <Route path="/bank-accounts" element={<PermissionRouteGuard requiredPermission="financial_view"><BankAccounts /></PermissionRouteGuard>} />
                              <Route path="/daily-operations" element={<DailyOperations />} />
                              <Route path="/customer-service" element={<PermissionRouteGuard requiredPermission="customer_service_view"><CustomerService /></PermissionRouteGuard>} />
                              <Route path="/crm" element={<PermissionRouteGuard requiredPermission="crm_view"><CRM /></PermissionRouteGuard>} />
                              <Route path="/crm-dashboard" element={<PermissionRouteGuard requiredPermission="crm_view"><CRMDashboard /></PermissionRouteGuard>} />
                              <Route path="/customer-portal" element={<PermissionRouteGuard requiredPermission="customer_portal_view"><CustomerPortalPage /></PermissionRouteGuard>} />
                              <Route path="/bookings-calendar" element={<BookingsCalendar />} />
                              <Route path="/database-manager" element={<PlatformAdminGuard><DatabaseManager /></PlatformAdminGuard>} />
                              <Route path="/team" element={<PermissionRouteGuard requiredPermission="team_invite"><TeamManagement /></PermissionRouteGuard>} />
                              <Route path="/whatsapp" element={<PermissionRouteGuard requiredPermission="whatsapp_view"><WhatsApp /></PermissionRouteGuard>} />
                              <Route path="/whatsapp-admin" element={<AdminRouteGuard><WhatsAppAdmin /></AdminRouteGuard>} />
                              <Route path="/admin/cms" element={<AdminRouteGuard><CMSPages /></AdminRouteGuard>} />
                              <Route path="/admin/cms/pages/:id/blocks" element={<AdminRouteGuard><PageBlocks /></AdminRouteGuard>} />
                              <Route path="/monitoring" element={<AdminRouteGuard><MonitoringDashboard /></AdminRouteGuard>} />
                              <Route path="/automation" element={<PermissionRouteGuard requiredPermission="automation_view"><AutomationRules /></PermissionRouteGuard>} />
                              <Route path="/documents" element={<PermissionRouteGuard requiredPermission="documents_view"><Documents /></PermissionRouteGuard>} />
                              <Route path="/audit-log" element={<PermissionRouteGuard requiredPermission="audit_view"><AuditLog /></PermissionRouteGuard>} />
                              <Route path="/bookings" element={<PermissionRouteGuard requiredPermission="bookings_view"><UnifiedBookings /></PermissionRouteGuard>} />
                              <Route path="/bookings/new" element={<PermissionRouteGuard requiredPermission="bookings_create"><NewUnifiedBooking /></PermissionRouteGuard>} />
                              <Route path="/bookings/:id" element={<PermissionRouteGuard requiredPermission="bookings_view"><UnifiedBookingDetails /></PermissionRouteGuard>} />
                              <Route path="/platform-admin" element={<PlatformAdminGuard><PlatformAdminDashboard /></PlatformAdminGuard>} />
                              <Route path="/platform-admin/organizations" element={<PlatformAdminGuard><PlatformAdminOrganizations /></PlatformAdminGuard>} />
                              <Route path="/platform-admin/subscriptions" element={<PlatformAdminGuard><PlatformAdminSubscriptions /></PlatformAdminGuard>} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                          </SubscriptionRedirectGuard>
                        </OptimizedErrorBoundary>
                    </DashboardLayout>
                    </OnboardingGuard>
                    </SubscriptionProvider>
                  </SupabaseProtectedRoute>
                  }
                />
              </Routes>
              </Suspense>
            </div>
          </OptimizedErrorBoundary>
          </OrganizationProvider>
          </OptimizedAuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
