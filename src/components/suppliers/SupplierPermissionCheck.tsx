
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SupplierPermissionCheckProps {
  children: React.ReactNode;
  action?: 'view' | 'create' | 'edit' | 'delete';
}

const SupplierPermissionCheck = ({ children, action = 'view' }: SupplierPermissionCheckProps) => {
  const { hasPermission } = usePermissionCheck();
  const { user, isSuperAdmin } = useAuth();

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

  // السوبر أدمن له صلاحية على كل شيء
  if (isSuperAdmin()) {
    return <>{children}</>;
  }

  // تحديد الصلاحية المطلوبة بناءً على العملية
  let requiredPermission: string;
  switch (action) {
    case 'create':
      requiredPermission = 'suppliers_create';
      break;
    case 'edit':
      requiredPermission = 'suppliers_edit';
      break;
    case 'delete':
      requiredPermission = 'suppliers_delete';
      break;
    case 'view':
    default:
      requiredPermission = 'suppliers_view';
      break;
  }

  const canAccess = hasPermission(requiredPermission as any);

  if (!canAccess) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          ليس لديك صلاحية {action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : 'عرض'} الموردين.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default SupplierPermissionCheck;
