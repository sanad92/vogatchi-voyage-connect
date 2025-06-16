
import { CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Calendar, DollarSign, CreditCard, User, Shield } from 'lucide-react';

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
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4 text-blue-500" />
          <span>{employee.department}</span>
        </div>
        
        {employee.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 text-green-500" />
            <span>{employee.phone}</span>
          </div>
        )}
        
        {employee.email && (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-4 w-4 text-orange-500" />
            <span className="break-all">{employee.email}</span>
          </div>
        )}
      </div>

      {/* معلومات مالية */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-purple-500" />
          <span className="text-gray-600">
            تاريخ التوظيف: {new Date(employee.hire_date).toLocaleDateString('ar-EG')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span className="font-semibold text-green-600">
            الراتب الإجمالي: {totalSalary.toLocaleString()} ج.م
          </span>
        </div>
        
        {employee.commission_rate && employee.commission_rate > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span className="text-blue-600">
              عمولة: {employee.commission_rate}%
            </span>
          </div>
        )}
      </div>

      {/* معلومات الحالة */}
      <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          {employee.linkedToUser ? (
            <>
              <User className="h-3 w-3 text-green-500" />
              <span className="text-green-600">مرتبط بحساب مستخدم</span>
            </>
          ) : (
            <>
              <User className="h-3 w-3 text-gray-400" />
              <span>غير مرتبط بحساب</span>
            </>
          )}
        </div>
        
        {canDelete && (
          <div className="flex items-center gap-1 text-red-500">
            <Shield className="h-3 w-3" />
            <span>إمكانية الحذف متاحة</span>
          </div>
        )}
      </div>
    </CardContent>
  );
};

export default EmployeeCardContent;
