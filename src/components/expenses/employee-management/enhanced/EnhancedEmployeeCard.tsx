
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmployeeActionsOptimized } from '@/hooks/useEmployeeActionsOptimized';
import ToggleEmployeeStatusDialog from '../dialogs/ToggleEmployeeStatusDialog';
import DeleteEmployeeDialog from '../dialogs/DeleteEmployeeDialog';
import EditEmployeeDialog from '../dialogs/EditEmployeeDialog';
import EmployeeCardActions from './components/EmployeeCardActions';

interface EnhancedEmployeeCardProps {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    employee_full_name: string;
    user_full_name?: string;
    position: string;
    department: string;
    phone?: string;
    email?: string;
    national_id?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    is_active: boolean;
    bank_account_number?: string;
    bank_name?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    linkedToUser: boolean;
    userId?: string;
  };
  onLinkEmployee?: (employeeId: string) => void;
}

const EnhancedEmployeeCard = ({ employee, onLinkEmployee }: EnhancedEmployeeCardProps) => {
  const { 
    updateEmployee,
    toggleEmployeeStatus, 
    deleteEmployee, 
    checkEmployeeDeletion,
    canToggleStatus,
    canDelete,
    canEdit,
    isLoading: isLoadingFn,
  } = useEmployeeActionsOptimized();
  const isLoading = typeof isLoadingFn === 'function' ? isLoadingFn() : !!isLoadingFn;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEditEmployee = () => {
    if (!canEdit) return;
    setIsEditDialogOpen(true);
  };

  const handleSaveEmployee = async (employeeData: any) => {
    const result = await updateEmployee(employeeData);
    if (!result.success) throw new Error(result.error);
  };

  const handleToggleStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    await toggleEmployeeStatus(employeeId, isActive, reason);
  };

  const handleDeleteEmployee = async (employeeId: string, forceDelete?: boolean, reason?: string) => {
    await deleteEmployee(employeeId, forceDelete, reason);
  };

  const profileUrl = `/hr/employees/${employee.id}`;
  return (
    <>
      <Card className="flex min-w-0 items-start justify-between gap-2 p-4">
        <Link to={profileUrl} className="group flex min-w-0 flex-1 items-start gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="rounded-lg bg-primary/10 p-2.5 text-primary"><UserRound className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-semibold group-hover:text-primary">
              <span className="truncate">{employee.full_name}</span><ArrowLeft className="h-4 w-4 shrink-0" />
            </span>
            <span className="mt-1 block truncate text-sm text-muted-foreground">
              {[employee.employee_code, employee.position, employee.department].filter(Boolean).join(' · ')}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant={employee.is_active ? 'secondary' : 'outline'}>{employee.is_active ? 'نشط' : 'موقوف'}</Badge>
              <Badge variant="outline">{employee.linkedToUser ? 'مرتبط بحساب' : 'بدون حساب'}</Badge>
            </span>
          </span>
        </Link>
        <EmployeeCardActions
          employee={employee} onLinkEmployee={onLinkEmployee} onEditEmployee={handleEditEmployee}
          onToggleStatus={() => setIsToggleDialogOpen(true)} onDelete={() => setIsDeleteDialogOpen(true)}
          isLoading={isLoading} canToggleStatus={canToggleStatus} canDelete={canDelete} canEdit={canEdit}
        />
      </Card>

      <EditEmployeeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employee={employee}
        onSave={handleSaveEmployee}
        isLoading={isLoading}
      />

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
