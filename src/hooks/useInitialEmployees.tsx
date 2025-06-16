
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useEmployees } from './useEmployees';

// عينة من الموظفين الافتراضيين
const sampleEmployees = [
  {
    employee_code: 'EMP-001',
    full_name: 'أحمد محمد علي',
    position: 'مدير المبيعات',
    department: 'المبيعات',
    phone: '+20123456789',
    email: 'ahmed@company.com',
    hire_date: '2024-01-15',
    salary_scale_level: 1,
    base_salary: 8000,
    allowances: 1500,
    commission_rate: 5,
    commission_type: 'percentage' as const,
    total_commission_earned: 0,
    is_active: true,
    bank_name: 'البنك الأهلي المصري',
    bank_account_number: '1234567890',
    emergency_contact_name: 'فاطمة علي',
    emergency_contact_phone: '+20987654321',
  },
  {
    employee_code: 'EMP-002',
    full_name: 'سارة أحمد حسن',
    position: 'محاسبة',
    department: 'المحاسبة',
    phone: '+20111222333',
    email: 'sara@company.com',
    hire_date: '2024-02-01',
    salary_scale_level: 1,
    base_salary: 6500,
    allowances: 1000,
    commission_rate: 0,
    commission_type: 'percentage' as const,
    total_commission_earned: 0,
    is_active: true,
    bank_name: 'بنك مصر',
    bank_account_number: '0987654321',
    emergency_contact_name: 'محمد حسن',
    emergency_contact_phone: '+20444555666',
  },
  {
    employee_code: 'EMP-003',
    full_name: 'محمد عبد الرحمن',
    position: 'مندوب مبيعات',
    department: 'المبيعات',
    phone: '+20777888999',
    email: 'mohamed@company.com',
    hire_date: '2024-03-10',
    salary_scale_level: 1,
    base_salary: 5000,
    allowances: 800,
    commission_rate: 3,
    commission_type: 'percentage' as const,
    total_commission_earned: 0,
    is_active: true,
    bank_name: 'البنك التجاري الدولي',
    bank_account_number: '5555666777',
    emergency_contact_name: 'عائشة عبد الرحمن',
    emergency_contact_phone: '+20333444555',
  }
];

export const useInitialEmployees = () => {
  const { isSuperAdmin } = useAuth();
  const { employees, addEmployee } = useEmployees();

  useEffect(() => {
    // فقط السوبر أدمن يمكنه إضافة الموظفين الافتراضيين
    if (!isSuperAdmin()) return;

    // إذا لم يكن هناك موظفين، أضف العينة
    if (employees && employees.length === 0) {
      console.log('🔄 إضافة موظفين افتراضيين...');
      
      sampleEmployees.forEach((employee, index) => {
        setTimeout(() => {
          addEmployee(employee);
        }, index * 1000); // تأخير بسيط بين كل إضافة
      });
    }
  }, [employees, isSuperAdmin, addEmployee]);

  return null; // هذا hook لا يعيد شيء
};
