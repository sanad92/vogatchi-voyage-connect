
import { CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Calendar, DollarSign, CreditCard, User, Shield, Building } from 'lucide-react';

interface EmployeeCardContentProps {
  employee: {
    department: string;
    phone?: string;
    email?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    linkedToUser: boolean;
  };
  canDelete: boolean;
}

const EmployeeCardContent = ({ employee, canDelete }: EmployeeCardContentProps) => {
  const totalSalary = employee.base_salary + employee.allowances;

  return (
    <CardContent className="space-y-4">
      {/* معلومات الاتصال والقسم */}
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <Building className="h-4 w-4 text-purple-500 flex-shrink-0" />
          <span className="font-medium">{employee.department}</span>
        </div>
        
        {employee.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm">{employee.phone}</span>
          </div>
        )}
        
        {employee.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="break-all text-sm">{employee.email}</span>
          </div>
        )}
      </div>

      {/* معلومات التوظيف والمالية */}
      <div className="border-t pt-3 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-orange-500 flex-shrink-0" />
          <span className="text-gray-700">
            <span className="font-medium">تاريخ التوظيف:</span> {new Date(employee.hire_date).toLocaleDateString('ar-EG')}
          </span>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">المعلومات المالية</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">الراتب الأساسي:</span>
              <span className="font-bold text-green-700">{employee.base_salary.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">البدلات:</span>
              <span className="font-bold text-blue-700">{employee.allowances.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-2">
              <span className="font-medium text-gray-700">الإجمالي:</span>
              <span className="font-bold text-lg text-green-600">{totalSalary.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
        
        {employee.commission_rate && employee.commission_rate > 0 && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded-lg border border-blue-100">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">
              <span className="font-medium">معدل العمولة:</span> {employee.commission_rate}%
            </span>
          </div>
        )}
      </div>

      {/* معلومات الحالة */}
      <div className="border-t pt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {employee.linkedToUser ? (
            <>
              <User className="h-3 w-3 text-green-500" />
              <span className="text-green-600 font-medium">مرتبط بحساب مستخدم</span>
            </>
          ) : (
            <>
              <User className="h-3 w-3 text-orange-500" />
              <span className="text-orange-600 font-medium">غير مرتبط بحساب</span>
            </>
          )}
        </div>
        
        {canDelete && (
          <div className="flex items-center gap-1 text-red-500">
            <Shield className="h-3 w-3" />
            <span className="font-medium">قابل للحذف</span>
          </div>
        )}
      </div>
    </CardContent>
  );
};

export default EmployeeCardContent;
