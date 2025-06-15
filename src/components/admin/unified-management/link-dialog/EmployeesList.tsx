
import { User } from 'lucide-react';
import EmployeeCard from './EmployeeCard';

interface EmployeesListProps {
  employees: Array<{
    id: string;
    full_name: string;
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
  }>;
  onLinkEmployee: (employeeId: string) => void;
}

const EmployeesList = ({ employees, onLinkEmployee }: EmployeesListProps) => {
  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">لا توجد موظفين متاحين</h3>
        <p className="text-gray-600">
          جميع الموظفين مرتبطين بمستخدمين أو لا توجد موظفين يطابقون البحث
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          onLink={onLinkEmployee}
        />
      ))}
    </div>
  );
};

export default EmployeesList;
