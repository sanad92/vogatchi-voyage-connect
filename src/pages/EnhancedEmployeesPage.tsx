
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import EnhancedEmployeeManagement from '@/components/expenses/employee-management/enhanced/EnhancedEmployeeManagement';
import { useInitialEmployees } from '@/hooks/useInitialEmployees';
import { useAuth } from '@/hooks/useAuth';

const EnhancedEmployeesPage = () => {
  useInitialEmployees();
  const { hasRole, isSuperAdmin } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-blue-600" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">إدارة الموظفين المحسنة</h1>
          <p className="text-gray-600">إدارة شاملة لبيانات الموظفين مع إمكانيات الإيقاف والحذف</p>
        </div>
        
        {/* مؤشر الصلاحيات */}
        <div className="flex items-center gap-2">
          {isSuperAdmin() && (
            <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs">
              <Shield className="h-3 w-3" />
              سوبر أدمن
            </div>
          )}
          {(hasRole('admin') || hasRole('manager')) && !isSuperAdmin() && (
            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
              <Shield className="h-3 w-3" />
              {hasRole('admin') ? 'أدمن' : 'مدير'}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>قائمة الموظفين</span>
            <div className="text-sm text-gray-500">
              {isSuperAdmin() && '• إمكانية الحذف متاحة'}
              {(hasRole('admin') || hasRole('manager')) && !isSuperAdmin() && '• إمكانية الإيقاف/التفعيل متاحة'}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedEmployeeManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedEmployeesPage;
