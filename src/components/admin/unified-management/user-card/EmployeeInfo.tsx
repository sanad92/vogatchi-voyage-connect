
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, DollarSign } from 'lucide-react';

interface EmployeeInfoProps {
  employee?: {
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate: number;
  };
}

const EmployeeInfo = ({ employee }: EmployeeInfoProps) => {
  if (!employee) {
    return (
      <div className="border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">غير مرتبط بموظف</span>
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            غير مرتبط
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
          <Briefcase className="h-3 w-3" />
          بيانات الموظف
        </h4>
        <Badge variant="outline" className="text-green-600 border-green-600">
          مرتبط
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">رقم الموظف:</span>
          <span>{employee.employee_code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">المنصب:</span>
          <span>{employee.position}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span>التوظيف: {new Date(employee.hire_date).toLocaleDateString('ar')}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-3 w-3 text-green-600" />
          <span>الراتب: {(employee.base_salary + employee.allowances).toLocaleString()} ج.م</span>
        </div>
        {employee.commission_rate > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-medium">العمولة:</span>
            <span>{employee.commission_rate}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeInfo;
