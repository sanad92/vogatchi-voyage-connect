
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useEmployeeActions } from '@/hooks/useEmployeeActions';
import { useAuth } from '@/hooks/useAuth';
import ToggleEmployeeStatusDialog from '../dialogs/ToggleEmployeeStatusDialog';
import DeleteEmployeeDialog from '../dialogs/DeleteEmployeeDialog';
import EmployeeCardHeader from './components/EmployeeCardHeader';
import EmployeeCardBadges from './components/EmployeeCardBadges';
import EmployeeCardActions from './components/EmployeeCardActions';
import EmployeeCardContent from './components/EmployeeCardContent';

interface EnhancedEmployeeCardProps {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    position: string;
    department: string;
    phone?: string;
    email?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    is_active: boolean;
    linkedToUser: boolean;
    userId?: string;
  };
  onLinkEmployee?: (employeeId: string) => void;
}

const EnhancedEmployeeCard = ({ employee, onLinkEmployee }: EnhancedEmployeeCardProps) => {
  const { 
    isLoading, 
    toggleEmployeeStatus, 
    deleteEmployee, 
    checkEmployeeDeletion,
    canToggleStatus,
    canDelete 
  } = useEmployeeActions();

  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleToggleStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    await toggleEmployeeStatus(employeeId, isActive, reason);
  };

  const handleDeleteEmployee = async (employeeId: string, forceDelete?: boolean, reason?: string) => {
    await deleteEmployee(employeeId, forceDelete, reason);
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-200 ${
        !employee.is_active ? 'opacity-75 border-red-200' : ''
      }`}>
        <EmployeeCardHeader employee={employee} />
        
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between">
            <EmployeeCardBadges employee={employee} />
            <EmployeeCardActions
              employee={employee}
              onLinkEmployee={onLinkEmployee}
              onToggleStatus={() => setIsToggleDialogOpen(true)}
              onDelete={() => setIsDeleteDialogOpen(true)}
              isLoading={isLoading}
              canToggleStatus={canToggleStatus}
              canDelete={canDelete}
            />
          </div>
        </div>

        <EmployeeCardContent employee={employee} canDelete={canDelete} />
      </Card>

      {/* حوارات التأكيد */}
      <ToggleEmployeeStatusDialog
        isOpen={isToggleDialogOpen}
        onOpenChange={setIsToggleDialogOpen}
        employee={employee}
        onConfirm={handleToggleStatus}
        isLoading={isLoading}
      />

      <DeleteEmployeeDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        employee={employee}
        onConfirm={handleDeleteEmployee}
        onCheckDeletion={checkEmployeeDeletion}
        isLoading={isLoading}
      />
    </>
  );
};

export default EnhancedEmployeeCard;
