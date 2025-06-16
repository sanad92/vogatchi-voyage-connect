
import { Badge } from '@/components/ui/badge';
import { Link } from 'lucide-react';

interface EmployeeCardBadgesProps {
  employee: {
    is_active: boolean;
    linkedToUser: boolean;
  };
}

const EmployeeCardBadges = ({ employee }: EmployeeCardBadgesProps) => {
  return (
    <div className="flex items-center gap-2">
      {/* شارة الحالة */}
      <Badge variant={employee.is_active ? "default" : "secondary"}>
        {employee.is_active ? 'نشط' : 'معطل'}
      </Badge>
      
      {/* شارة الربط */}
      {employee.linkedToUser && (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Link className="h-3 w-3 mr-1" />
          مرتبط
        </Badge>
      )}
    </div>
  );
};

export default EmployeeCardBadges;
