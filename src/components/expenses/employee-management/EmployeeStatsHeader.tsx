
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';

interface EmployeeStatsHeaderProps {
  linkedEmployeesCount: number;
  unlinkedEmployeesCount: number;
  isRefreshing: boolean;
  unifiedLoading: boolean;
  onRefresh: () => void;
  onAddEmployee: () => void;
}

const EmployeeStatsHeader = ({
  linkedEmployeesCount,
  unlinkedEmployeesCount,
  isRefreshing,
  unifiedLoading,
  onRefresh,
  onAddEmployee,
}: EmployeeStatsHeaderProps) => {
  const { currentEmployee } = useUserEmployeeMapping();

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold mb-2">إدارة الموظفين</h2>
        <p className="text-gray-600">إدارة بيانات الموظفين ومعلوماتهم الأساسية (جميع الرواتب بالجنيه المصري)</p>
        {currentEmployee && (
          <div className="mt-2 p-2 bg-green-50 rounded-lg">
            <span className="text-green-800 text-sm">
              مرتبط بالموظف: {currentEmployee.full_name} ({currentEmployee.employee_code})
            </span>
          </div>
        )}
        
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-blue-800 text-sm">
              <strong>النظام الموحد:</strong> {linkedEmployeesCount} موظف مرتبط بمستخدمين، {unlinkedEmployeesCount} موظف غير مرتبط.
              للحصول على تجربة كاملة وإدارة موحدة، يرجى استخدام{' '}
              <button 
                onClick={() => window.location.href = '/admin-settings'}
                className="underline font-medium hover:text-blue-900"
              >
                نظام الإدارة الموحد
              </button>
              {' '}في إعدادات الأدمن.
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing || unifiedLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(isRefreshing || unifiedLoading) ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'جاري التحديث...' : 'تحديث'}
        </Button>
        
        <Button onClick={onAddEmployee} className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          إضافة موظف جديد
        </Button>
      </div>
    </div>
  );
};

export default EmployeeStatsHeader;
