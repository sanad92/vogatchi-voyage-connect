
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, DollarSign, Link } from 'lucide-react';

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {employee.full_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? 'نشط' : 'معطل'}
            </Badge>
            {employee.linkedToUser && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                مرتبط
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">رقم الموظف:</span>
            <p className="font-medium">{employee.employee_code}</p>
          </div>
          <div>
            <span className="text-gray-600">المنصب:</span>
            <p className="font-medium">{employee.position}</p>
          </div>
          {employee.department && (
            <div>
              <span className="text-gray-600">القسم:</span>
              <p className="font-medium">{employee.department}</p>
            </div>
          )}
          <div>
            <span className="text-gray-600">تاريخ التوظيف:</span>
            <p className="font-medium">{new Date(employee.hire_date).toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

        {/* معلومات الاتصال */}
        {(employee.phone || employee.email) && (
          <div className="border-t pt-3 space-y-2">
            {employee.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{employee.phone}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
          </div>
        )}

        {/* معلومات الراتب */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-gray-600">الراتب الأساسي:</span>
            <span className="font-medium text-green-600">
              {formatSalary(employee.base_salary)}
            </span>
          </div>
          {employee.allowances > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 ml-6">البدلات:</span>
              <span className="font-medium text-green-600">
                {formatSalary(employee.allowances)}
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
              className="flex-1 flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              ربط بمستخدم
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1">
            تعديل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
