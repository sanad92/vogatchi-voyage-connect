import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { Navigate } from 'react-router-dom';

interface PermissionRouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}

/**
 * Guards routes based on permissions from useSupabasePermissions.
 * Falls back to role check if requiredRoles provided.
 * Super admins / platform admins always pass.
 */
const PermissionRouteGuard = ({ children, requiredPermission, requiredRoles }: PermissionRouteGuardProps) => {
  const { isSuperAdmin, loading } = useOptimizedAuth();
  const { orgRole, loading: orgLoading } = useOrganization();
  const { hasPermission } = useSupabasePermissions();

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

  // Super admin bypasses all checks
  if (isSuperAdmin()) return <>{children}</>;

  // Check permission
  if (requiredPermission) {
    if (hasPermission(requiredPermission as any)) return <>{children}</>;
  }

  // Check roles as fallback
  if (requiredRoles && orgRole && requiredRoles.includes(orgRole)) {
    return <>{children}</>;
  }

  // If no permission specified, allow (shouldn't happen)
  if (!requiredPermission && !requiredRoles) return <>{children}</>;

  return <Navigate to="/dashboard" replace />;
};

export default PermissionRouteGuard;
