
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Badge } from '@/components/ui/badge';

const EnhancedEmployeesPage = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">إدارة الموظفين المحسنة</h1>
          <p className="text-muted-foreground">إدارة شاملة لبيانات الموظفين مع إمكانيات الإيقاف والحذف</p>
        </div>
        
        {/* مؤشر الصلاحيات */}
        <div className="flex items-center gap-2">
          {isSuperAdmin() && (
            <Badge variant="destructive" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              سوبر أدمن
            </Badge>
          )}
          {(hasRole('admin') || hasRole('manager')) && !isSuperAdmin() && (
            <Badge className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {hasRole('admin') ? 'أدمن' : 'مدير'}
            </Badge>
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
