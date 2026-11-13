import { Navigate } from 'react-router-dom';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface Props {
  children: React.ReactNode;
}

const PlatformAdminGuard = ({ children }: Props) => {
  const { isPlatformAdmin, loading } = usePlatformAdmin();
  const { isLoggedIn } = useOptimizedAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn() || !isPlatformAdmin) {
    return <Navigate to="/platform/login" replace />;
  }

  return <>{children}</>;
};

export default PlatformAdminGuard;
