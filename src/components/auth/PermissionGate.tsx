
import { ReactNode } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
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
  const { hasRole } = useOptimizedAuth();

  let hasAccess = true;

  if (requiredRole) {
    hasAccess = hasRole(requiredRole);
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
