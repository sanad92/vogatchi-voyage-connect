
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
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const DataDeletion = lazy(() => import("@/pages/DataDeletion"));

// Dashboard & Core
const OptimizedIndex = lazy(() => import("@/pages/OptimizedIndex"));
const Customers = lazy(() => import("@/pages/Customers"));
const DuplicateCustomersPage = lazy(() => import("@/pages/DuplicateCustomers"));
const DataQualityPage = lazy(() => import("@/pages/DataQuality"));
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
const BookingWorkspace = lazy(() => import("@/pages/BookingWorkspace"));

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

// Communication

const WhatsAppAdmin = lazy(() => import("@/pages/WhatsAppAdmin"));
const WhatsAppInbox = lazy(() => import("@/pages/WhatsAppInbox"));
const WhatsAppConversationDetail = lazy(() => import("@/pages/WhatsAppConversationDetail"));

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
const ExportCenter = lazy(() => import("@/components/export/ExportCenter"));
const CMSPages = lazy(() => import("@/pages/admin/CMSPages"));
const PageBlocks = lazy(() => import("@/pages/admin/PageBlocks"));

// Platform Admin
const PlatformLayout = lazy(() => import("@/components/platform-admin/PlatformLayout"));
const PlatformAdminDashboard = lazy(() => import("@/pages/platform-admin/PlatformAdminDashboard"));
const PlatformAdminOrganizations = lazy(() => import("@/pages/platform-admin/PlatformAdminOrganizations"));
const PlatformAdminSubscriptions = lazy(() => import("@/pages/platform-admin/PlatformAdminSubscriptions"));
const PlatformAdminSettings = lazy(() => import("@/pages/platform-admin/PlatformAdminSettings"));
const PlatformAdminTransfers = lazy(() => import("@/pages/platform-admin/PlatformAdminTransfers"));
const PlatformAdminAccounts = lazy(() => import("@/pages/platform-admin/PlatformAdminAccounts"));
const PlatformAdminPlans = lazy(() => import("@/pages/platform-admin/PlatformAdminPlans"));
const PlatformAdminAudit = lazy(() => import("@/pages/platform-admin/PlatformAdminAudit"));
const PlatformAdminAnalytics = lazy(() => import("@/pages/platform-admin/PlatformAdminAnalytics"));
const PlatformAdminGlobalData = lazy(() => import("@/pages/platform-admin/PlatformAdminGlobalData"));

// Subscription
const SubscriptionExpiredPage = lazy(() => import("@/pages/SubscriptionExpired"));
const SubscriptionManagement = lazy(() => import("@/pages/SubscriptionManagement"));

// ERP Accounting
const ChartOfAccountsPage = lazy(() => import("@/pages/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("@/pages/JournalEntriesPage"));
const AccountingReportsPage = lazy(() => import("@/pages/AccountingReportsPage"));
const SupplierRatesPage = lazy(() => import("@/pages/SupplierRatesPage"));
const SupplierAllotmentsPage = lazy(() => import("@/pages/SupplierAllotmentsPage"));
const CostCentersPage = lazy(() => import("@/pages/CostCentersPage"));
const AccountingPeriodsPage = lazy(() => import("@/pages/AccountingPeriodsPage"));
const CFODashboard = lazy(() => import("@/pages/CFODashboard"));
const CustomerLedger = lazy(() => import("@/pages/CustomerLedger"));
const SupplierLedger = lazy(() => import("@/pages/SupplierLedger"));
const ExecutiveFinance = lazy(() => import("@/pages/ExecutiveFinance"));
const FinancialValidation = lazy(() => import("@/pages/FinancialValidation"));
const GeneralLedger = lazy(() => import("@/pages/GeneralLedger"));
const BankReconciliation = lazy(() => import("@/pages/BankReconciliation"));
const TravelKPIs = lazy(() => import("@/pages/TravelKPIs"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const TreasuryManagement = lazy(() => import("@/pages/finance/TreasuryManagement"));
const CashFlowDashboard = lazy(() => import("@/pages/finance/CashFlowDashboard"));
const FinanceApprovals = lazy(() => import("@/pages/finance/FinanceApprovals"));
const TrialBalance = lazy(() => import("@/pages/finance/TrialBalance"));
const IncomeStatement = lazy(() => import("@/pages/finance/IncomeStatement"));
const BalanceSheet = lazy(() => import("@/pages/finance/BalanceSheet"));

// Phase 7 - SaaS Core & Enterprise
const OrganizationCenter = lazy(() => import("@/pages/organization/OrganizationCenter"));
const BranchesPage = lazy(() => import("@/pages/organization/BranchesPage"));
const DepartmentsPage = lazy(() => import("@/pages/organization/DepartmentsPage"));
const FeatureFlagsPage = lazy(() => import("@/pages/organization/FeatureFlagsPage"));
const WhiteLabelPage = lazy(() => import("@/pages/organization/WhiteLabelPage"));
const SecurityCenterPage = lazy(() => import("@/pages/organization/SecurityCenterPage"));
const PlatformActAsPage = lazy(() => import("@/pages/platform-admin/PlatformActAsPage"));

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
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/data-deletion" element={<DataDeletion />} />

                {/* Platform Admin — separate layout, no DashboardLayout */}
                <Route path="/platform/*" element={
                  <SupabaseProtectedRoute>
                    <PlatformAdminGuard>
                      <PlatformLayout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route index element={<PlatformAdminDashboard />} />
                            <Route path="organizations" element={<PlatformAdminOrganizations />} />
                            <Route path="subscriptions" element={<PlatformAdminSubscriptions />} />
                            <Route path="plans" element={<PlatformAdminPlans />} />
                            <Route path="transfers" element={<PlatformAdminTransfers />} />
                            <Route path="accounts" element={<PlatformAdminAccounts />} />
                            <Route path="audit" element={<PlatformAdminAudit />} />
                            <Route path="analytics" element={<PlatformAdminAnalytics />} />
                            <Route path="settings" element={<PlatformAdminSettings />} />
                            <Route path="database" element={<DatabaseManager />} />
                            <Route path="global-data" element={<PlatformAdminGlobalData />} />
                            <Route path="monitoring" element={<MonitoringDashboard />} />
                            <Route path="act-as" element={<PlatformActAsPage />} />
                            <Route path="*" element={<Navigate to="/platform" replace />} />

                          </Routes>
                        </Suspense>
                      </PlatformLayout>
                    </PlatformAdminGuard>
                  </SupabaseProtectedRoute>
                } />

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
                              <Route path="/customers" element={<PermissionRouteGuard requiredPermission="customers_view"><Customers /></PermissionRouteGuard>} />
                              <Route path="/duplicate-customers" element={<PermissionRouteGuard requiredPermission="customers_view"><DuplicateCustomersPage /></PermissionRouteGuard>} />
                              <Route path="/data-quality" element={<DataQualityPage />} />
                              <Route path="/new-customer" element={<PermissionRouteGuard requiredPermission="customers_create"><NewCustomer /></PermissionRouteGuard>} />
                              <Route path="/customers/:customerId" element={<PermissionRouteGuard requiredPermission="customers_view"><CustomerDetails /></PermissionRouteGuard>} />
                              <Route path="/hotel-bookings" element={<PermissionRouteGuard requiredPermission="bookings_view"><HotelBookings /></PermissionRouteGuard>} />
                              <Route path="/new-hotel-booking" element={<PermissionRouteGuard requiredPermission="bookings_create"><NewHotelBooking /></PermissionRouteGuard>} />
                              <Route path="/flight-bookings" element={<PermissionRouteGuard requiredPermission="bookings_view"><FlightBookings /></PermissionRouteGuard>} />
                              <Route path="/new-flight-booking" element={<PermissionRouteGuard requiredPermission="bookings_create"><NewFlightBooking /></PermissionRouteGuard>} />
                              <Route path="/car-rentals" element={<PermissionRouteGuard requiredPermission="bookings_view"><CarRentals /></PermissionRouteGuard>} />
                              <Route path="/transport-bookings" element={<PermissionRouteGuard requiredPermission="bookings_view"><TransportBookings /></PermissionRouteGuard>} />
                              <Route path="/quotes" element={<PermissionRouteGuard requiredPermission="quotes_view"><Quotes /></PermissionRouteGuard>} />
                              <Route path="/quotes/new" element={<PermissionRouteGuard requiredPermission="quotes_create"><NewQuote /></PermissionRouteGuard>} />
                              <Route path="/quotes/:id" element={<PermissionRouteGuard requiredPermission="quotes_view"><QuoteDetails /></PermissionRouteGuard>} />
                              <Route path="/invoices" element={<PermissionRouteGuard requiredPermission="invoices_view"><Invoices /></PermissionRouteGuard>} />
                              <Route path="/new-invoice" element={<PermissionRouteGuard requiredPermission="invoices_create"><NewInvoice /></PermissionRouteGuard>} />
                              <Route path="/suppliers" element={<PermissionRouteGuard requiredPermission="suppliers_view"><Suppliers /></PermissionRouteGuard>} />
                              <Route path="/supplier-rates" element={<PermissionRouteGuard requiredPermission="suppliers_view"><SupplierRatesPage /></PermissionRouteGuard>} />
                              <Route path="/supplier-allotments" element={<PermissionRouteGuard requiredPermission="suppliers_view"><SupplierAllotmentsPage /></PermissionRouteGuard>} />
                              <Route path="/reports" element={<PermissionRouteGuard requiredPermission="reports_view"><Reports /></PermissionRouteGuard>} />
                              <Route path="/profit-loss-reports" element={<Navigate to="/accounting-reports" replace />} />
                              <Route path="/profit-analytics" element={<PermissionRouteGuard requiredPermission="reports_advanced"><ProfitAnalytics /></PermissionRouteGuard>} />
                              <Route path="/expense-management" element={<PermissionRouteGuard requiredPermission="expenses_view"><ExpenseManagementEnhanced /></PermissionRouteGuard>} />
                              <Route path="/employees-enhanced" element={<Navigate to="/team" replace />} />
                              <Route path="/employees" element={<Navigate to="/team" replace />} />
                              <Route path="/admin-settings" element={<PermissionRouteGuard requiredPermission="admin_settings"><AdminSettings /></PermissionRouteGuard>} />
                              <Route path="/landing-admin" element={<PermissionRouteGuard requiredPermission="admin_settings"><AdminSettings /></PermissionRouteGuard>} />
                              <Route path="/admin-import-export" element={<PermissionRouteGuard requiredPermission="admin_settings"><AdminImportExport /></PermissionRouteGuard>} />
                              <Route path="/site-customization" element={<PermissionRouteGuard requiredPermission="admin_settings"><SiteCustomization /></PermissionRouteGuard>} />
                              {/* <Route path="/payment-orders" element={<PermissionRouteGuard requiredPermission="financial_view"><PaymentOrders /></PermissionRouteGuard>} /> Deferred: payment_orders table not implemented */}
                              <Route path="/payment-success" element={<PaymentSuccess />} />
                              <Route path="/bank-accounts" element={<PermissionRouteGuard requiredPermission="financial_view"><BankAccounts /></PermissionRouteGuard>} />
                              <Route path="/daily-operations" element={<PermissionRouteGuard requiredPermission="bookings_view"><DailyOperations /></PermissionRouteGuard>} />
                              <Route path="/customer-service" element={<PermissionRouteGuard requiredPermission="customer_service_view"><CustomerService /></PermissionRouteGuard>} />
                              <Route path="/crm" element={<PermissionRouteGuard requiredPermission="crm_view"><CRM /></PermissionRouteGuard>} />
                              <Route path="/crm-dashboard" element={<PermissionRouteGuard requiredPermission="crm_view"><CRMDashboard /></PermissionRouteGuard>} />
                              
                              <Route path="/bookings-calendar" element={<PermissionRouteGuard requiredPermission="bookings_view"><BookingsCalendar /></PermissionRouteGuard>} />
                              <Route path="/database-manager" element={<PlatformAdminGuard><DatabaseManager /></PlatformAdminGuard>} />
                              <Route path="/team" element={<TeamManagement />} />
                             <Route path="/whatsapp" element={<Navigate to="/whatsapp-inbox" replace />} />
                             <Route path="/whatsapp-inbox" element={<PermissionRouteGuard requiredPermission="whatsapp_view"><WhatsAppInbox /></PermissionRouteGuard>} />
                             <Route path="/whatsapp-inbox/:conversationId" element={<PermissionRouteGuard requiredPermission="whatsapp_view"><WhatsAppConversationDetail /></PermissionRouteGuard>} />
                             <Route path="/whatsapp-admin" element={<PermissionRouteGuard requiredPermission="whatsapp_admin"><WhatsAppAdmin /></PermissionRouteGuard>} />
                              <Route path="/admin/cms" element={<PermissionRouteGuard requiredPermission="admin_settings"><CMSPages /></PermissionRouteGuard>} />
                              <Route path="/admin/cms/pages/:id/blocks" element={<PermissionRouteGuard requiredPermission="admin_settings"><PageBlocks /></PermissionRouteGuard>} />
                              <Route path="/monitoring" element={<PermissionRouteGuard requiredPermission="admin_settings"><MonitoringDashboard /></PermissionRouteGuard>} />
                              <Route path="/automation" element={<PermissionRouteGuard requiredPermission="automation_view"><AutomationRules /></PermissionRouteGuard>} />
                              <Route path="/documents" element={<PermissionRouteGuard requiredPermission="documents_view"><Documents /></PermissionRouteGuard>} />
                              <Route path="/audit-log" element={<PermissionRouteGuard requiredPermission="audit_view"><AuditLog /></PermissionRouteGuard>} />
                              <Route path="/export-center" element={<PermissionRouteGuard requiredPermission="reports_view"><ExportCenter /></PermissionRouteGuard>} />
                              <Route path="/bookings" element={<PermissionRouteGuard requiredPermission="bookings_view"><UnifiedBookings /></PermissionRouteGuard>} />
                              <Route path="/bookings/new" element={<PermissionRouteGuard requiredPermission="bookings_create"><NewUnifiedBooking /></PermissionRouteGuard>} />
                              <Route path="/bookings/:id" element={<PermissionRouteGuard requiredPermission="bookings_view"><UnifiedBookingDetails /></PermissionRouteGuard>} />
                              <Route path="/bookings/:id/workspace" element={<PermissionRouteGuard requiredPermission="bookings_view"><BookingWorkspace /></PermissionRouteGuard>} />
                              <Route path="/erp-dashboard" element={<Navigate to="/cfo-dashboard" replace />} />
                              <Route path="/chart-of-accounts" element={<PermissionRouteGuard requiredPermission="financial_view"><ChartOfAccountsPage /></PermissionRouteGuard>} />
                              <Route path="/journal-entries" element={<PermissionRouteGuard requiredPermission="financial_view"><JournalEntriesPage /></PermissionRouteGuard>} />
                              <Route path="/accounting-reports" element={<PermissionRouteGuard requiredPermission="financial_view"><AccountingReportsPage /></PermissionRouteGuard>} />
                              <Route path="/cfo-dashboard" element={<PermissionRouteGuard requiredPermission="financial_view"><CFODashboard /></PermissionRouteGuard>} />
                              <Route path="/customer-ledger" element={<PermissionRouteGuard requiredPermission="financial_view"><CustomerLedger /></PermissionRouteGuard>} />
                              <Route path="/supplier-ledger" element={<PermissionRouteGuard requiredPermission="financial_view"><SupplierLedger /></PermissionRouteGuard>} />
                             <Route path="/executive-finance" element={<PermissionRouteGuard requiredPermission="financial_view"><ExecutiveFinance /></PermissionRouteGuard>} />
                             <Route path="/treasury" element={<PermissionRouteGuard requiredPermission="financial_view"><TreasuryManagement /></PermissionRouteGuard>} />
                             <Route path="/cash-flow" element={<PermissionRouteGuard requiredPermission="financial_view"><CashFlowDashboard /></PermissionRouteGuard>} />
                             <Route path="/finance-approvals" element={<PermissionRouteGuard requiredPermission="financial_view"><FinanceApprovals /></PermissionRouteGuard>} />
                             <Route path="/trial-balance" element={<PermissionRouteGuard requiredPermission="financial_view"><TrialBalance /></PermissionRouteGuard>} />
                             <Route path="/income-statement" element={<PermissionRouteGuard requiredPermission="financial_view"><IncomeStatement /></PermissionRouteGuard>} />
                             <Route path="/balance-sheet" element={<PermissionRouteGuard requiredPermission="financial_view"><BalanceSheet /></PermissionRouteGuard>} />
                              <Route path="/financial-validation" element={<PermissionRouteGuard requiredPermission="financial_view"><FinancialValidation /></PermissionRouteGuard>} />
                              <Route path="/cost-centers" element={<PermissionRouteGuard requiredPermission="financial_view"><CostCentersPage /></PermissionRouteGuard>} />
                              <Route path="/accounting-periods" element={<PermissionRouteGuard requiredPermission="financial_view"><AccountingPeriodsPage /></PermissionRouteGuard>} />
                              <Route path="/general-ledger" element={<PermissionRouteGuard requiredPermission="financial_view"><GeneralLedger /></PermissionRouteGuard>} />
                              <Route path="/bank-reconciliation" element={<PermissionRouteGuard requiredPermission="financial_view"><BankReconciliation /></PermissionRouteGuard>} />
                              <Route path="/travel-kpis" element={<PermissionRouteGuard requiredPermission="financial_view"><TravelKPIs /></PermissionRouteGuard>} />
                              <Route path="/ai-assistant" element={<PermissionRouteGuard requiredPermission="financial_view"><AIAssistant /></PermissionRouteGuard>} />
                              <Route path="/ai-assistant/:threadId" element={<PermissionRouteGuard requiredPermission="financial_view"><AIAssistant /></PermissionRouteGuard>} />
                              {/* Phase 7 — Enterprise / SaaS Core */}
                              <Route path="/organization" element={<OrganizationCenter />} />
                              <Route path="/organization/branches" element={<PermissionRouteGuard requiredPermission="admin_settings"><BranchesPage /></PermissionRouteGuard>} />
                              <Route path="/organization/departments" element={<PermissionRouteGuard requiredPermission="admin_settings"><DepartmentsPage /></PermissionRouteGuard>} />
                              <Route path="/organization/feature-flags" element={<PermissionRouteGuard requiredPermission="admin_settings"><FeatureFlagsPage /></PermissionRouteGuard>} />
                              <Route path="/organization/white-label" element={<PermissionRouteGuard requiredPermission="admin_settings"><WhiteLabelPage /></PermissionRouteGuard>} />
                              <Route path="/organization/security" element={<PermissionRouteGuard requiredPermission="admin_settings"><SecurityCenterPage /></PermissionRouteGuard>} />
                              {/* /platform-admin/* routes moved to /platform/* (with backward-compat redirects above) */}

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
