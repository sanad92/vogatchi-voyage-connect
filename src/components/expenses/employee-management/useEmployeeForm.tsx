
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
    commission_rate: 0,
    commission_type: 'percentage',
    total_commission_earned: 0,
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
      commission_rate: 0,
      commission_type: 'percentage',
      total_commission_earned: 0,
      is_active: true,
      bank_account_number: '',
      bank_name: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
  };

  const validateForm = () => {
    console.log('🔄 فحص صحة النموذج:', newEmployee);
    
    // التحقق من الحقول المطلوبة
    if (!newEmployee.full_name?.trim()) {
      toast.error('الاسم الكامل مطلوب');
      return false;
    }
    
    if (!newEmployee.employee_code?.trim()) {
      toast.error('رقم الموظف مطلوب');
      return false;
    }
    
    if (!newEmployee.position?.trim()) {
      toast.error('المنصب مطلوب');
      return false;
    }

    if (!newEmployee.hire_date) {
      toast.error('تاريخ التوظيف مطلوب');
      return false;
    }

    // التحقق من صحة البريد الإلكتروني إذا تم إدخاله
    if (newEmployee.email && !isValidEmail(newEmployee.email.trim())) {
      toast.error('البريد الإلكتروني غير صحيح');
      return false;
    }

    // التحقق من أن الراتب الأساسي رقم موجب أو صفر
    if (newEmployee.base_salary < 0) {
      toast.error('الراتب الأساسي يجب أن يكون رقماً موجباً أو صفر');
      return false;
    }

    // التحقق من البدلات
    if (newEmployee.allowances < 0) {
      toast.error('البدلات يجب أن تكون رقماً موجباً أو صفر');
      return false;
    }

    // التحقق من معدل العمولة
    if (newEmployee.commission_rate && (newEmployee.commission_rate < 0 || newEmployee.commission_rate > 100)) {
      toast.error('معدل العمولة يجب أن يكون بين 0 و 100');
      return false;
    }

    console.log('✅ النموذج صحيح');
    return true;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return {
    newEmployee,
    setNewEmployee,
    resetForm,
    validateForm,
  };
};
