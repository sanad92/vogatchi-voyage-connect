
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface CurrentEmployeeDisplayProps {
  employee: {
    id: string;
    full_name: string;
    employee_code?: string;
  } | null;
  showLabel?: boolean;
  className?: string;
}

const CurrentEmployeeDisplay = ({ 
  employee, 
  showLabel = true, 
  className = "" 
}: CurrentEmployeeDisplayProps) => {
  if (!employee) return null;

  return (
    <div className={`bg-blue-50 p-4 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4 text-blue-600" />
        {showLabel && <span className="text-sm font-medium text-blue-800">موظف الحجز</span>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-white">
          {employee.full_name}
        </Badge>
        {employee.employee_code && employee.employee_code !== "USER" && (
          <Badge variant="outline" className="bg-white text-xs">
            {employee.employee_code}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default CurrentEmployeeDisplay;
