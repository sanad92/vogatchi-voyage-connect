
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useEmployeeActions } from '@/hooks/useEmployeeActions';
import { useAuth } from '@/hooks/useAuth';
import ToggleEmployeeStatusDialog from '../dialogs/ToggleEmployeeStatusDialog';
import DeleteEmployeeDialog from '../dialogs/DeleteEmployeeDialog';
import ViewEmployeeDialog from '../dialogs/ViewEmployeeDialog';
import EditEmployeeDialog from '../dialogs/EditEmployeeDialog';
import EmployeeCardHeader from './components/EmployeeCardHeader';
import EmployeeCardBadges from './components/EmployeeCardBadges';
import EmployeeCardActions from './components/EmployeeCardActions';
import EmployeeCardContent from './components/EmployeeCardContent';

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
    isLoading, 
    updateEmployee,
    toggleEmployeeStatus, 
    deleteEmployee, 
    checkEmployeeDeletion,
    canToggleStatus,
    canDelete,
    canEdit 
  } = useEmployeeActions();

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleViewDetails = () => {
    setIsViewDialogOpen(true);
  };

  const handleEditEmployee = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveEmployee = async (employeeData: any) => {
    await updateEmployee(employeeData);
  };

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
              onViewDetails={handleViewDetails}
              onEditEmployee={handleEditEmployee}
              onToggleStatus={() => setIsToggleDialogOpen(true)}
              onDelete={() => setIsDeleteDialogOpen(true)}
              isLoading={isLoading}
              canToggleStatus={canToggleStatus}
              canDelete={canDelete}
              canEdit={canEdit}
            />
          </div>
        </div>

        <EmployeeCardContent employee={employee} canDelete={canDelete} />
      </Card>

      {/* حوار عرض التفاصيل */}
      <ViewEmployeeDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        employee={employee}
      />

      {/* حوار التعديل */}
      <EditEmployeeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employee={employee}
        onSave={handleSaveEmployee}
        isLoading={isLoading}
      />

      {/* حوار تغيير الحالة */}
      <ToggleEmployeeStatusDialog
        isOpen={isToggleDialogOpen}
        onOpenChange={setIsToggleDialogOpen}
        employee={employee}
        onConfirm={handleToggleStatus}
        isLoading={isLoading}
      />

      {/* حوار الحذف */}
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
