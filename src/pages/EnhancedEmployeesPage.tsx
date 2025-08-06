
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const EnhancedEmployeesPage = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-blue-600" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">إدارة الموظفين المحسنة</h1>
          <p className="text-muted-foreground">إدارة شاملة لبيانات الموظفين مع إمكانيات الإيقاف والحذف</p>
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
            <div className="text-sm text-muted-foreground">
              {isSuperAdmin() && '• إمكانية الحذف متاحة'}
              {(hasRole('admin') || hasRole('manager')) && !isSuperAdmin() && '• إمكانية الإيقاف/التفعيل متاحة'}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedEmployeesPage;
