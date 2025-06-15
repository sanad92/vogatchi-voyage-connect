
import { useEffect, useState } from 'react';
import { useEmployees } from './useEmployees';

const initialEmployees = [
  {
    employee_code: 'EMP001',
    full_name: 'أحمد محمد',
    email: 'ahmed@vogatchi.com',
    position: 'مدير مبيعات',
    department: 'المبيعات',
    hire_date: '2023-01-15',
    salary_scale_level: 3,
    base_salary: 8000.00,
    allowances: 1000.00,
    commission_rate: 5.0,
    is_active: true
  },
  {
    employee_code: 'EMP002',
    full_name: 'فاطمة علي',
    email: 'fatma@vogatchi.com',
    position: 'مندوب حجوزات',
    department: 'الحجوزات',
    hire_date: '2023-02-01',
    salary_scale_level: 2,
    base_salary: 5000.00,
    allowances: 500.00,
    commission_rate: 3.0,
    is_active: true
  },
  {
    employee_code: 'EMP003',
    full_name: 'محمد حسن',
    email: 'mohamed@vogatchi.com',
    position: 'محاسب',
    department: 'المحاسبة',
    hire_date: '2023-03-10',
    salary_scale_level: 2,
    base_salary: 7000.00,
    allowances: 800.00,
    commission_rate: 2.0,
    is_active: true
  },
  {
    employee_code: 'EMP004',
    full_name: 'سارة أحمد',
    email: 'sara@vogatchi.com',
    position: 'مندوب مبيعات',
    department: 'المبيعات',
    hire_date: '2023-04-05',
    salary_scale_level: 1,
    base_salary: 4500.00,
    allowances: 400.00,
    commission_rate: 4.0,
    is_active: true
  },
  {
    employee_code: 'EMP005',
    full_name: 'علي محمود',
    email: 'ali@vogatchi.com',
    position: 'مساعد إداري',
    department: 'الإدارة',
    hire_date: '2023-05-20',
    salary_scale_level: 1,
    base_salary: 3500.00,
    allowances: 300.00,
    commission_rate: 1.0,
    is_active: true
  },
  {
    employee_code: 'EMP006',
    full_name: 'نور الدين',
    email: 'nour@vogatchi.com',
    position: 'مطور نظم',
    department: 'تقنية المعلومات',
    hire_date: '2023-06-15',
    salary_scale_level: 3,
    base_salary: 9000.00,
    allowances: 1200.00,
    commission_rate: 0.0,
    is_active: true
  }
];

export const useInitialEmployees = () => {
  const { employees, addEmployee } = useEmployees();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (employees && employees.length === 0 && !initialized) {
      setInitialized(true);
      
      // Add initial employees one by one
      initialEmployees.forEach((employee, index) => {
        setTimeout(() => {
          addEmployee(employee);
        }, index * 500); // Stagger the additions to avoid conflicts
      });
    }
  }, [employees, addEmployee, initialized]);

  return { initialized };
};
