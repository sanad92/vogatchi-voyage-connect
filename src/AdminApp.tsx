import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { OptimizedAuthProvider } from '@/hooks/useOptimizedAuth';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import SupabaseProtectedRoute from '@/components/SupabaseProtectedRoute';
import PlatformAdminGuard from '@/components/platform-admin/PlatformAdminGuard';
import PlatformLayout from '@/components/platform-admin/PlatformLayout';
import OptimizedErrorBoundary from '@/components/common/OptimizedErrorBoundary';

const Dashboard = lazy(() => import('@/pages/platform-admin/PlatformAdminDashboard'));
const Organizations = lazy(() => import('@/pages/platform-admin/PlatformAdminOrganizations'));
const Subscriptions = lazy(() => import('@/pages/platform-admin/PlatformAdminSubscriptions'));
const Plans = lazy(() => import('@/pages/platform-admin/PlatformAdminPlans'));
const Transfers = lazy(() => import('@/pages/platform-admin/PlatformAdminTransfers'));
const Accounts = lazy(() => import('@/pages/platform-admin/PlatformAdminAccounts'));
const Audit = lazy(() => import('@/pages/platform-admin/PlatformAdminAudit'));
const EventBus = lazy(() => import('@/pages/platform-admin/PlatformEventBus'));
const EventExplorer = lazy(() => import('@/pages/platform-admin/PlatformEventExplorer'));
const Analytics = lazy(() => import('@/pages/platform-admin/PlatformAdminAnalytics'));
const Settings = lazy(() => import('@/pages/platform-admin/PlatformAdminSettings'));
const Database = lazy(() => import('@/pages/DatabaseManager'));
const Support = lazy(() => import('@/pages/platform-admin/PlatformSupport'));
const GlobalData = lazy(() => import('@/pages/platform-admin/PlatformAdminGlobalData'));
const Monitoring = lazy(() => import('@/pages/MonitoringDashboard'));
const ActAs = lazy(() => import('@/pages/platform-admin/PlatformActAsPage'));
const WorkflowRules = lazy(() => import('@/pages/platform-admin/PlatformWorkflowRules'));
const Login = lazy(() => import('@/pages/LoginPage'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function AdminApp() {
  return <LanguageProvider><QueryClientProvider client={queryClient}><BrowserRouter>
    <OptimizedAuthProvider><OrganizationProvider><OptimizedErrorBoundary>
      <Toaster position="top-right" />
      <Suspense fallback={<div dir="rtl" className="p-8">جارٍ التحميل...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/access-denied" element={<main dir="rtl" className="p-10"><h1 className="text-2xl font-bold">غير مصرح بالدخول</h1><p className="mt-4">هذا الحساب ليس لديه صلاحية إدارة منصة SafarERP.</p></main>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/platform/*" element={<SupabaseProtectedRoute><PlatformAdminGuard fallbackPath="/access-denied"><PlatformLayout>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="plans" element={<Plans />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="audit" element={<Audit />} />
              <Route path="event-bus" element={<EventBus />} />
              <Route path="event-bus/:id" element={<EventExplorer />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="database" element={<Database />} />
              <Route path="support" element={<Support />} />
              <Route path="global-data" element={<GlobalData />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="act-as" element={<ActAs />} />
              <Route path="workflow-rules" element={<WorkflowRules />} />
              <Route path="*" element={<Navigate to="/platform" replace />} />
            </Routes>
          </PlatformLayout></PlatformAdminGuard></SupabaseProtectedRoute>} />
          <Route path="*" element={<Navigate to="/platform" replace />} />
        </Routes>
      </Suspense>
    </OptimizedErrorBoundary></OrganizationProvider></OptimizedAuthProvider>
  </BrowserRouter></QueryClientProvider></LanguageProvider>;
}
