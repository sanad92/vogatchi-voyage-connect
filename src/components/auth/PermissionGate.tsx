
import { ReactNode } from 'react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

type PermissionKey = keyof Omit<import('@/hooks/useUserPermissionsManagement').DetailedUserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface PermissionGateProps {
  children: ReactNode;
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showMessage?: boolean;
}

const PermissionGate = ({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback,
  showMessage = true 
}: PermissionGateProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissionCheck();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    
    if (!showMessage) return null;
    
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          ليس لديك صلاحية للوصول إلى هذا المحتوى
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export { PermissionGate };
export default PermissionGate;
