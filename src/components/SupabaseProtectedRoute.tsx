import { useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

interface SupabaseProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const SupabaseProtectedRoute = ({ children, requiredRole }: SupabaseProtectedRouteProps) => {
  const { user, profile, loading, hasRole, isSuperAdmin, isLoggedIn, session } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();
  const { isPlatformAdmin, loading: platformLoading } = usePlatformAdmin();
  const location = useLocation();

  // Proactively refresh session if it's about to expire (within 5 min)
  useEffect(() => {
    if (!session?.expires_at) return;
    const expiresInMs = session.expires_at * 1000 - Date.now();
    if (expiresInMs > 0 && expiresInMs < 5 * 60 * 1000) {
      supabase.auth.refreshSession().catch(() => {});
    }
  }, [session?.expires_at]);

  if (loading || orgLoading || platformLoading) {
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
    return <Navigate to="/login" replace />;
  }

  // Don't redirect to create-organization flow if we're already there
  const isOnRegisterOrg =
    location.pathname === '/register-organization' ||
    location.pathname === '/create-organization';
  const isOnOnboarding = location.pathname === '/onboarding';
  
  if (!hasOrganization && !isSuperAdmin() && !isPlatformAdmin && !isOnRegisterOrg && !isOnOnboarding) {
    return <Navigate to="/create-organization" replace />;
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
