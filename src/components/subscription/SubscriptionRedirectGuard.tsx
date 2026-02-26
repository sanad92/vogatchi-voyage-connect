import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirects to /subscription-expired when subscription is inactive,
 * but allows read-only access to certain routes.
 * Platform admins are never redirected (handled in SubscriptionContext).
 */
const SubscriptionRedirectGuard = ({ children }: { children: React.ReactNode }) => {
  const { isReadOnly, loading } = useSubscription();
  const { pathname } = useLocation();

  // Wait until both subscription and admin status are resolved
  if (loading) return <>{children}</>;

  // If not read-only (active subscription or platform admin), allow everything
  if (!isReadOnly) return <>{children}</>;

  // Allow subscription/payment pages themselves
  const allowedAlways = ['/subscription-expired', '/subscription', '/pricing', '/payment', '/payment-success', '/forgot-password', '/reset-password', '/auth'];
  if (allowedAlways.some(r => pathname === r || pathname.startsWith(r + '?'))) return <>{children}</>;

  // Platform admin routes always allowed
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
  const isDetailView = pathname.startsWith('/customers/');

  if (!isReadOnlyRoute && !isDetailView) {
    return <Navigate to="/subscription-expired" replace />;
  }

  return <>{children}</>;
};

export default SubscriptionRedirectGuard;
