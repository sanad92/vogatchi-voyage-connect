import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirects to /subscription-expired when subscription is inactive,
 * but allows read-only access to /dashboard and /reports routes.
 * Platform admins are never redirected.
 */
const SubscriptionRedirectGuard = ({ children }: { children: React.ReactNode }) => {
  const { isReadOnly, loading } = useSubscription();
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();
  const { pathname } = useLocation();

  if (loading || adminLoading) return <>{children}</>;

  // Platform admins bypass all subscription restrictions
  if (isPlatformAdmin) return <>{children}</>;

  // Allow subscription/payment pages themselves
  const allowedAlways = ['/subscription-expired', '/subscription', '/pricing', '/payment', '/payment-success', '/forgot-password', '/reset-password', '/auth'];
  if (allowedAlways.some(r => pathname === r || pathname.startsWith(r + '?'))) return <>{children}</>;

  // Platform admin routes always allowed (guard handled separately)
  if (pathname.startsWith('/platform-admin')) return <>{children}</>;

  // Read-only routes still accessible when expired
  const readOnlyRoutes = [
    '/dashboard', '/customers', '/hotel-bookings', '/flight-bookings',
    '/car-rentals', '/transport-bookings', '/invoices', '/reports',
    '/profit-loss-reports', '/suppliers', '/employees-enhanced',
    '/bank-accounts', '/bookings-calendar', '/crm-dashboard',
    '/admin-settings',
  ];

  const isReadOnlyRoute = readOnlyRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  // Also allow detail views (read)
  const isDetailView = pathname.startsWith('/customers/');

  if (isReadOnly && !isReadOnlyRoute && !isDetailView) {
    return <Navigate to="/subscription-expired" replace />;
  }

  return <>{children}</>;
};

export default SubscriptionRedirectGuard;
