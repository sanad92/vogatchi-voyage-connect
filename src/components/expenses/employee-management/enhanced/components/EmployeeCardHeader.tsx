
import { CardHeader, CardTitle } from '@/components/ui/card';
import { User, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EmployeeCardHeaderProps {
  employee: {
    full_name: string;
    employee_full_name: string;
    user_full_name?: string;
    employee_code: string;
    position: string;
    is_active: boolean;
    linkedToUser: boolean;
  };
}

const EmployeeCardHeader = ({ employee }: EmployeeCardHeaderProps) => {
  // تحديد ما إذا كان اسم المستخدم مختلف عن اسم الموظف
  const hasUserName = employee.linkedToUser && employee.user_full_name;
  const isDifferentName = hasUserName && employee.user_full_name !== employee.employee_full_name;

  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            employee.is_active ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <User className={`h-6 w-6 ${
              employee.is_active ? 'text-blue-600' : 'text-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{employee.employee_full_name}</CardTitle>
              {employee.linkedToUser && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Link className="h-3 w-3 mr-1" />
                  مرتبط
                </Badge>
              )}
            </div>
            
            {/* عرض اسم المستخدم إذا كان مختلف */}
            {isDifferentName && (
              <p className="text-sm text-blue-600 font-medium">
                المستخدم: {employee.user_full_name}
              </p>
            )}
            
            <p className="text-sm text-gray-600">
              {employee.employee_code} | {employee.position}
            </p>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

export default EmployeeCardHeader;
