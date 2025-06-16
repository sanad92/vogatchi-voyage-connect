
import { useState } from 'react';
import { toast } from 'sonner';
import type { Employee } from '@/types/expenses';

export const useEmployeeForm = () => {
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>({
    employee_code: '',
    full_name: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    national_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary_scale_level: 1,
    base_salary: 0,
    allowances: 0,
    is_active: true,
    bank_account_number: '',
    bank_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const resetForm = () => {
    setNewEmployee({
      employee_code: '',
      full_name: '',
      position: '',
      department: '',
      phone: '',
      email: '',
      national_id: '',
      hire_date: new Date().toISOString().split('T')[0],
      salary_scale_level: 1,
      base_salary: 0,
      allowances: 0,
      is_active: true,
      bank_account_number: '',
      bank_name: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
  };

  const validateForm = () => {
    if (!newEmployee.full_name.trim()) {
      toast.error('الاسم الكامل مطلوب');
      return false;
    }
    
    if (!newEmployee.employee_code.trim()) {
      toast.error('رقم الموظف مطلوب');
      return false;
    }
    
    if (!newEmployee.position.trim()) {
      toast.error('المنصب مطلوب');
      return false;
    }

    return true;
  };

  return {
    newEmployee,
    setNewEmployee,
    resetForm,
    validateForm,
  };
};
