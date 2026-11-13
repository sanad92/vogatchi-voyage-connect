import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { usePlatformFinanceRole } from '@/hooks/usePlatformFinanceRole';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface Props {
  children: React.ReactNode;
}

const PlatformAdminGuard = ({ children }: Props) => {
  const { isPlatformAdmin, isPlatformOwner, loading } = usePlatformAdmin();
  const { isLoggedIn } = useOptimizedAuth();
  const finance = usePlatformFinanceRole();
  const { pathname } = useLocation();
  const financePath = pathname === '/platform/finance' || pathname === '/platform/finance/';

  if (loading || (isLoggedIn() && (financePath || !isPlatformAdmin) && finance.loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn()) return <Navigate to="/platform/login" replace />;
  if (financePath && finance.isError) {
    return <div role="alert" className="space-y-3 p-6">
      <p>تعذّر التحقق من صلاحيات الحسابات</p>
      <Button type="button" onClick={() => finance.refetch()}>إعادة المحاولة</Button>
    </div>;
  }
  if (financePath && finance.role) return <>{children}</>;
  if (!isPlatformAdmin) return <Navigate to={finance.role ? '/platform/finance' : '/platform/login'} replace />;
  if (financePath && !finance.loading) return <Navigate to="/platform" replace />;
  const ownerOnlyPath = ['/platform/event-bus', '/platform/settings', '/platform/audit', '/platform/monitoring'].some(route => pathname === route || pathname.startsWith(route + '/'));
  if (ownerOnlyPath && !isPlatformOwner) {
    return <Navigate to="/platform" replace />;
  }

  return <>{children}</>;
};

export default PlatformAdminGuard;
