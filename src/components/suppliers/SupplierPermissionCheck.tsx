
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface SupplierPermissionCheckProps {
  children: React.ReactNode;
  action?: 'view' | 'create' | 'edit' | 'delete';
}

const SupplierPermissionCheck = ({ children, action = 'view' }: SupplierPermissionCheckProps) => {
  const { hasRole, userRole, user } = useAuth();

  // Check if user has permission to manage suppliers
  const canManageSuppliers = hasRole('super_admin') || hasRole('admin') || hasRole('manager') || hasRole('sales_agent');

  if (!user) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          يجب تسجيل الدخول أولاً للوصول إلى إدارة الموردين
        </AlertDescription>
      </Alert>
    );
  }

  if (!userRole) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <ShieldAlert className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          لم يتم تعيين دور لحسابك. يرجى التواصل مع المدير لتعيين الصلاحيات المناسبة.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canManageSuppliers) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          ليس لديك صلاحية {action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : 'عرض'} الموردين. 
          الأدوار المسموحة: المدير، الإداري، مدير المبيعات، وكيل المبيعات.
          دورك الحالي: {userRole}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default SupplierPermissionCheck;
