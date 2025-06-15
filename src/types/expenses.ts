export interface ExpenseCategory {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  color: string;
  budget_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string;
  department?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  hire_date: string;
  salary_scale_level: number;
  base_salary: number;
  allowances: number;
  is_active: boolean;
  bank_account_number?: string;
  bank_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryScale {
  id: string;
  position: string;
  level: number;
  min_salary: number;
  max_salary: number;
  annual_increment: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RentContract {
  id: string;
  contract_number: string;
  property_type: string;
  property_address: string;
  landlord_name: string;
  landlord_phone?: string;
  monthly_rent: number;
  currency: string;
  start_date: string;
  end_date: string;
  renewal_period_months: number;
  annual_increase_percentage: number;
  security_deposit: number;
  contract_terms?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlySalary {
  id: string;
  employee_id: string;
  employee?: Employee;
  salary_month: string;
  base_salary: number;
  allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  deductions: number;
  bonus: number;
  gross_salary: number;
  tax_amount: number;
  insurance_deduction: number;
  net_salary: number;
  currency?: string; // إضافة دعم العملة للراتب الشهري
  exchange_rate?: number; // سعر الصرف المستخدم
  net_salary_egp?: number; // الراتب الصافي بالجنيه المصري
  payment_date?: string;
  payment_method: string;
  bank_account_id?: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RentPayment {
  id: string;
  contract_id: string;
  contract?: RentContract;
  payment_month: string;
  amount: number;
  currency: string;
  due_date: string;
  payment_date?: string;
  payment_method: string;
  bank_account_id?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  late_fee: number;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseTransaction {
  id: string;
  transaction_number: string;
  category_id: string;
  category?: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_method: string;
  bank_account_id?: string;
  vendor_name?: string;
  vendor_phone?: string;
  invoice_number?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  id: string;
  category_id: string;
  category?: ExpenseCategory;
  budget_year: number;
  budget_month?: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  currency: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
