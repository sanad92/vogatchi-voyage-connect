import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirects to /subscription-expired when subscription is inactive,
 * but allows read-only access to /dashboard and /reports routes.
 * Platform admins are never redirected.
 */
const SubscriptionRedirectGuard = ({ children }: { children: React.ReactNode }) => {
  const { isReadOnly, loading } = useSubscription();
  const { pathname } = useLocation();

  if (loading) return <>{children}</>;

  // Allow the expired page itself
  if (pathname === '/subscription-expired') return <>{children}</>;

  // Read-only routes still accessible when expired
  const readOnlyRoutes = [
    '/dashboard', '/customers', '/hotel-bookings', '/flight-bookings',
    '/car-rentals', '/transport-bookings', '/invoices', '/reports',
    '/profit-loss-reports', '/suppliers', '/employees-enhanced',
    '/bank-accounts', '/bookings-calendar', '/crm-dashboard',
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
