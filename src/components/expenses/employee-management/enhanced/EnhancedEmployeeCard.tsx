
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
  const { isSuperAdmin, userRole } = useAuth();
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

  // تسجيل مفصل للصلاحيات على مستوى البطاقة
  console.log('🏷️ EnhancedEmployeeCard - صلاحيات الموظف:', {
    employeeName: employee.full_name,
    employeeId: employee.id,
    userRole,
    isSuperAdmin: isSuperAdmin(),
    canToggleStatus,
    canDelete,
    canEdit,
    isActive: employee.is_active,
    linkedToUser: employee.linkedToUser
  });

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleViewDetails = () => {
    console.log('👁️ عرض تفاصيل الموظف:', employee.full_name);
    setIsViewDialogOpen(true);
  };

  const handleEditEmployee = () => {
    if (!canEdit) {
      console.error('❌ ليس لديك صلاحية لتعديل الموظف');
      return;
    }
    console.log('✏️ تعديل الموظف:', employee.full_name);
    setIsEditDialogOpen(true);
  };

  const handleSaveEmployee = async (employeeData: any) => {
    console.log('💾 حفظ تعديلات الموظف:', employeeData.full_name);
    await updateEmployee(employeeData);
  };

  const handleToggleStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    console.log(`🔄 ${isActive ? 'تفعيل' : 'إيقاف'} الموظف:`, { employeeId, isActive, reason });
    await toggleEmployeeStatus(employeeId, isActive, reason);
  };

  const handleDeleteEmployee = async (employeeId: string, forceDelete?: boolean, reason?: string) => {
    console.log('🗑️ حذف الموظف:', { employeeId, forceDelete, reason });
    await deleteEmployee(employeeId, forceDelete, reason);
  };

  // إضافة مؤشر بصري خاص بالسوبر أدمن
  const cardClassName = `group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-md ${
    !employee.is_active 
      ? 'bg-gradient-to-br from-gray-50 to-gray-100 opacity-90 border-red-200' 
      : 'bg-gradient-to-br from-white to-blue-50/30'
  } ${isSuperAdmin() ? 'ring-2 ring-red-100 ring-opacity-50' : ''}`;

  return (
    <>
      <Card className={cardClassName}>
        {/* مؤشر السوبر أدمن */}
        {isSuperAdmin() && (
          <div className="absolute top-2 right-2 z-20">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              سوبر أدمن
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
        
        <div className="relative z-10">
          <EmployeeCardHeader employee={employee} />
          
          <div className="px-6 pb-3">
            <div className="flex items-center justify-between mb-4">
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
        </div>
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
