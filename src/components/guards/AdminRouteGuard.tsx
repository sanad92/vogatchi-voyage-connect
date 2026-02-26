import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Navigate } from 'react-router-dom';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

/**
 * Guards admin-only routes. Checks org role (owner/admin) OR platform admin.
 */
const AdminRouteGuard = ({ children, requiredRoles = ['owner', 'admin'] }: AdminRouteGuardProps) => {
  const { isSuperAdmin, loading } = useOptimizedAuth();
  const { orgRole, loading: orgLoading } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin()) return <>{children}</>;

  if (orgRole && requiredRoles.includes(orgRole)) return <>{children}</>;

  return <Navigate to="/dashboard" replace />;
};

export default AdminRouteGuard;
