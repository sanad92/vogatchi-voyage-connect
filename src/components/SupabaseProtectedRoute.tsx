import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Navigate } from 'react-router-dom';

interface SupabaseProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const SupabaseProtectedRoute = ({ children, requiredRole }: SupabaseProtectedRouteProps) => {
  const { user, profile, loading, hasRole, isSuperAdmin, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasOrganization && !isSuperAdmin()) {
    return <Navigate to="/register-organization" replace />;
  }

  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">حسابك غير مفعل</h2>
          <p className="text-muted-foreground mb-4">حسابك غير مفعل حالياً.</p>
          <p className="text-sm text-muted-foreground">يرجى التواصل مع المدير لتفعيل حسابك.</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole) && !isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">ليس لديك صلاحية للوصول</h2>
          <p className="text-muted-foreground">عذراً، لا تملك الصلاحيات المطلوبة لعرض هذه الصفحة.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SupabaseProtectedRoute;
