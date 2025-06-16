
import { Badge } from '@/components/ui/badge';
import { Check, X, Link } from 'lucide-react';

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
        className={`${employee.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
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
      {employee.linkedToUser && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Link className="h-3 w-3 mr-1" />
          مرتبط بمستخدم
        </Badge>
      )}
    </div>
  );
};

export default EmployeeCardBadges;
