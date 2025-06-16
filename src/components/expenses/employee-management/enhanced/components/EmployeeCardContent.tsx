
import { CardContent } from '@/components/ui/card';
import { 
  Mail, 
  Phone, 
  Calendar, 
  AlertTriangle
} from 'lucide-react';

interface EmployeeCardContentProps {
  employee: {
    email?: string;
    phone?: string;
    hire_date: string;
    department: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    linkedToUser: boolean;
  };
  canDelete: boolean;
}

const EmployeeCardContent = ({ employee, canDelete }: EmployeeCardContentProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  return (
    <CardContent className="space-y-4">
      {/* تحذير للموظفين مع ارتباطات (إذا كان سوبر أدمن) */}
      {canDelete && employee.linkedToUser && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
          <div className="flex items-center gap-2 text-orange-700 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>قد يحتاج حذف إجباري بسبب الارتباطات</span>
          </div>
        </div>
      )}

      {/* معلومات الاتصال */}
      <div className="space-y-2">
        {employee.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{employee.email}</span>
          </div>
        )}
        {employee.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{employee.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>تاريخ التوظيف: {formatDate(employee.hire_date)}</span>
        </div>
      </div>

      {/* معلومات القسم */}
      {employee.department && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">القسم: </span>
          <span className="text-gray-600">{employee.department}</span>
        </div>
      )}

      {/* معلومات الراتب */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">الراتب الأساسي:</span>
          <span className="font-medium">{formatCurrency(employee.base_salary)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">البدلات:</span>
          <span className="font-medium">{formatCurrency(employee.allowances)}</span>
        </div>
        {employee.commission_rate && employee.commission_rate > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">نسبة العمولة:</span>
            <span className="font-medium text-green-600">
              {employee.commission_rate}%
            </span>
          </div>
        )}
        <div className="border-t pt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">إجمالي الراتب:</span>
          <span className="font-bold text-blue-600">
            {formatCurrency(employee.base_salary + employee.allowances)}
          </span>
        </div>
      </div>
    </CardContent>
  );
};

export default EmployeeCardContent;
