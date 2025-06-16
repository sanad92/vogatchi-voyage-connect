
import { Badge } from '@/components/ui/badge';
import { Check, X, Link, User } from 'lucide-react';

interface EmployeeCardBadgesProps {
  employee: {
    is_active: boolean;
    linkedToUser: boolean;
    full_name: string;
  };
}

const EmployeeCardBadges = ({ employee }: EmployeeCardBadgesProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {/* شارة الحالة */}
      <Badge 
        variant={employee.is_active ? "default" : "secondary"}
        className={employee.is_active 
          ? 'bg-green-500 text-white hover:bg-green-600'
          : 'bg-gray-400 text-white'
        }
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
        <Badge 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          <Link className="h-3 w-3 mr-1" />
          مرتبط بمستخدم
        </Badge>
      ) : (
        <Badge 
          variant="outline" 
          className="bg-orange-50 text-orange-600 border-orange-200"
        >
          <User className="h-3 w-3 mr-1" />
          غير مرتبط
        </Badge>
      )}
    </div>
  );
};

export default EmployeeCardBadges;
