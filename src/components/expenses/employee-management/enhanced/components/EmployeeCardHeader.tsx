
import { CardHeader, CardTitle } from '@/components/ui/card';
import { User, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

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
  const { isSuperAdmin } = useAuth();
  
  // تحديد ما إذا كان اسم المستخدم مختلف عن اسم الموظف
  const hasUserName = employee.linkedToUser && employee.user_full_name;
  const isDifferentName = hasUserName && employee.user_full_name !== employee.employee_full_name;

  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            employee.is_active 
              ? 'bg-blue-100 border-2 border-blue-300' 
              : 'bg-gray-100 border-2 border-gray-300'
          }`}>
            <User className={`h-6 w-6 ${
              employee.is_active ? 'text-blue-600' : 'text-gray-400'
            }`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className={`text-lg font-bold ${
                employee.is_active ? 'text-gray-800' : 'text-gray-500'
              }`}>
                {employee.employee_full_name}
                {isSuperAdmin() && (
                  <span className="text-sm text-red-600 font-normal ml-2">
                    (السوبر أدمن)
                  </span>
                )}
              </CardTitle>
              
              {/* شارة الربط */}
              {employee.linkedToUser && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Link className="h-3 w-3 mr-1" />
                  مرتبط
                </Badge>
              )}
            </div>
            
            {/* عرض اسم المستخدم إذا كان مختلف */}
            {isDifferentName && (
              <p className="text-sm text-blue-600 font-medium mb-1">
                المستخدم: {employee.user_full_name}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                {employee.employee_code}
              </span>
              <span className="text-gray-500">|</span>
              <span className={`font-medium ${
                employee.is_active ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {employee.position}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

export default EmployeeCardHeader;
