
import { Badge } from '@/components/ui/badge';
import { Check, X, Link, User } from 'lucide-react';

interface EmployeeCardBadgesProps {
  employee: {
    is_active: boolean;
    linkedToUser: boolean;
  };
}

const EmployeeCardBadges = ({ employee }: EmployeeCardBadgesProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {/* شارة الحالة */}
      <Badge 
        variant={employee.is_active ? "default" : "secondary"}
        className={`transition-all duration-200 ${
          employee.is_active 
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-sm hover:shadow-md' 
            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-500'
        }`}
      >
        {employee.is_active ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            نشط
          </>
        ) : (
          <>
            <X className="h-3 w-3 mr-1" />
            معطل
          </>
        )}
      </Badge>

      {/* شارة الربط */}
      {employee.linkedToUser ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
          <Link className="h-3 w-3 mr-1" />
          مرتبط بمستخدم
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 font-medium">
          <User className="h-3 w-3 mr-1" />
          غير مرتبط
        </Badge>
      )}
    </div>
  );
};

export default EmployeeCardBadges;
