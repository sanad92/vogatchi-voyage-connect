
import { ReactNode } from 'react';
import { usePhpAuth } from '@/hooks/usePhpAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
  showMessage?: boolean;
}

const PermissionGate = ({ 
  children, 
  requiredRole,
  fallback,
  showMessage = true 
}: PermissionGateProps) => {
  const { hasRole, isSuperAdmin } = usePhpAuth();

  let hasAccess = true;

  if (requiredRole) {
    hasAccess = hasRole(requiredRole) || isSuperAdmin();
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
