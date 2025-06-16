
import { CardHeader, CardTitle } from '@/components/ui/card';
import { User, Link, Crown, Shield } from 'lucide-react';
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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative ${
            employee.is_active 
              ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300'
          }`}>
            <User className={`h-6 w-6 ${
              employee.is_active ? 'text-blue-600' : 'text-gray-400'
            }`} />
            
            {/* مؤشر السوبر أدمن على الأفاتار */}
            {isSuperAdmin() && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className={`text-lg font-bold transition-colors duration-200 ${
                employee.is_active ? 'text-gray-800' : 'text-gray-500'
              }`}>
                {employee.employee_full_name}
              </CardTitle>
              
              {/* شارة الربط */}
              {employee.linkedToUser && (
                <Badge variant="outline" className={`text-xs font-medium transition-all duration-200 ${
                  isSuperAdmin() 
                    ? 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  <Link className="h-3 w-3 mr-1" />
                  مرتبط
                  {isSuperAdmin() && <Crown className="h-3 w-3 ml-1" />}
                </Badge>
              )}
              
              {/* شارة السوبر أدمن */}
              {isSuperAdmin() && (
                <Badge className="text-xs bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md">
                  <Crown className="h-3 w-3 mr-1" />
                  <Shield className="h-3 w-3 mr-1" />
                  عرض سوبر أدمن
                </Badge>
              )}
            </div>
            
            {/* عرض اسم المستخدم إذا كان مختلف */}
            {isDifferentName && (
              <p className={`text-sm font-medium mb-1 transition-colors duration-200 ${
                isSuperAdmin() ? 'text-red-600' : 'text-blue-600'
              }`}>
                المستخدم: {employee.user_full_name}
                {isSuperAdmin() && (
                  <span className="ml-2 text-xs text-red-500">
                    (مرئي للسوبر أدمن)
                  </span>
                )}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`px-2 py-1 text-gray-700 rounded text-xs font-mono transition-all duration-200 ${
                isSuperAdmin() 
                  ? 'bg-red-100 border border-red-200'
                  : 'bg-gray-100'
              }`}>
                {employee.employee_code}
              </span>
              <span className="text-gray-500">|</span>
              <span className={`font-medium transition-colors duration-200 ${
                employee.is_active ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {employee.position}
              </span>
              
              {/* مؤشر إضافي للسوبر أدمن */}
              {isSuperAdmin() && (
                <>
                  <span className="text-gray-500">|</span>
                  <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    SA
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

export default EmployeeCardHeader;
