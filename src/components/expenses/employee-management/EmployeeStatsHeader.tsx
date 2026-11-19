
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';

interface EmployeeStatsHeaderProps {
  linkedEmployeesCount: number;
  unlinkedEmployeesCount: number;
  isRefreshing: boolean;
  unifiedLoading: boolean;
  onRefresh: () => void;
  onAddEmployee?: () => void;
}

const EmployeeStatsHeader = ({
  linkedEmployeesCount,
  unlinkedEmployeesCount,
  isRefreshing,
  unifiedLoading,
  onRefresh,
  onAddEmployee,
}: EmployeeStatsHeaderProps) => {

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">ملفات الموظفين</h2>
        <p className="text-sm text-muted-foreground">
          {linkedEmployeesCount} مرتبط بحساب · {unlinkedEmployeesCount} بدون حساب دخول
        </p>
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
        
        {onAddEmployee && <Button onClick={onAddEmployee} className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          إضافة موظف جديد
        </Button>}
      </div>
    </div>
  );
};

export default EmployeeStatsHeader;
