
import { CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

interface EmployeeCardHeaderProps {
  employee: {
    full_name: string;
    employee_code: string;
    position: string;
    is_active: boolean;
  };
}

const EmployeeCardHeader = ({ employee }: EmployeeCardHeaderProps) => {
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
          <div>
            <CardTitle className="text-lg">{employee.full_name}</CardTitle>
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
