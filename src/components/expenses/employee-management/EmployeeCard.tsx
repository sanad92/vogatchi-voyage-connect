
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, DollarSign, Link, Calendar, Building } from 'lucide-react';

interface EnhancedEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  hire_date: string;
  base_salary: number;
  allowances: number;
  is_active: boolean;
  linkedToUser: boolean;
  userId?: string;
}

interface EmployeeCardProps {
  employee: EnhancedEmployee;
  onLinkEmployee: (employeeId: string) => void;
}

const EmployeeCard = ({ employee, onLinkEmployee }: EmployeeCardProps) => {
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <span className="truncate">{employee.full_name}</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? 'نشط' : 'معطل'}
            </Badge>
            {employee.linkedToUser && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                مرتبط
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* المعلومات الأساسية */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600 font-medium">رقم الموظف:</span>
            <p className="font-semibold text-gray-900">{employee.employee_code}</p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">المنصب:</span>
            <p className="font-semibold text-gray-900 truncate" title={employee.position}>
              {employee.position}
            </p>
          </div>
          {employee.department && (
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">القسم:</span>
                <span className="font-medium text-gray-900">{employee.department}</span>
              </div>
            </div>
          )}
          <div className="col-span-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">تاريخ التوظيف:</span>
              <span className="font-medium text-gray-900">{formatDate(employee.hire_date)}</span>
            </div>
          </div>
        </div>

        {/* معلومات الاتصال */}
        {(employee.phone || employee.email) && (
          <div className="border-t pt-3 space-y-2">
            {employee.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{employee.phone}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700 truncate" title={employee.email}>
                  {employee.email}
                </span>
              </div>
            )}
          </div>
        )}

        {/* معلومات الراتب */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-gray-600 text-sm">الراتب الأساسي:</span>
            </div>
            <span className="font-semibold text-green-600">
              {formatSalary(employee.base_salary)}
            </span>
          </div>
          {employee.allowances > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 ml-6">البدلات:</span>
              <span className="font-medium text-green-600">
                {formatSalary(employee.allowances)}
              </span>
            </div>
          )}
          {(employee.base_salary + employee.allowances) > 0 && (
            <div className="flex items-center justify-between text-sm border-t pt-2">
              <span className="text-gray-700 font-medium">الإجمالي:</span>
              <span className="font-bold text-green-700">
                {formatSalary(employee.base_salary + employee.allowances)}
              </span>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات */}
        <div className="border-t pt-3 flex gap-2">
          {!employee.linkedToUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLinkEmployee(employee.id)}
              className="flex-1 flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
            >
              <Link className="h-4 w-4" />
              ربط بمستخدم
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 hover:bg-gray-50"
            onClick={() => {
              // TODO: إضافة وظيفة التعديل
              console.log('تعديل موظف:', employee.id);
            }}
          >
            تعديل
          </Button>
        </div>

        {/* معلومات إضافية للموظفين المرتبطين */}
        {employee.linkedToUser && employee.userId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <User className="h-4 w-4" />
              <span className="font-medium">مرتبط بحساب مستخدم</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              يمكن للموظف الوصول إلى النظام بحسابه الشخصي
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
