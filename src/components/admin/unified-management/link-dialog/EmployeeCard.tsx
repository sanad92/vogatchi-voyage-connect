
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, DollarSign } from 'lucide-react';

interface EmployeeCardProps {
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
  };
  onLink: (employeeId: string) => void;
}

const EmployeeCard = ({ employee, onLink }: EmployeeCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{employee.full_name}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>رقم الموظف: {employee.employee_code}</div>
              <div>المنصب: {employee.position}</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(employee.hire_date).toLocaleDateString('ar')}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {(employee.base_salary + employee.allowances).toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => onLink(employee.id)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            ربط
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
