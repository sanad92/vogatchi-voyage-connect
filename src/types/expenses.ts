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
  commission_rate?: number;
  commission_type?: string;
  total_commission_earned?: number;
  is_active: boolean;
  bank_account_number?: string;
  bank_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCommission {
  id: string;
  employee_id: string;
  booking_id?: string;
  booking_type: 'hotel' | 'flight' | 'transport' | 'car_rental';
  booking_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  commission_date: string;
  payment_status: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface CommissionPayment {
  id: string;
  employee_id: string;
  payment_period_start: string;
  payment_period_end: string;
  total_commission_amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  bank_account_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

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

export interface ExpenseTransaction {
  id: string;
  transaction_number: string;
  category_id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_method: string;
  vendor_name?: string;
  vendor_phone?: string;
  invoice_number?: string;
  receipt_url?: string;
  status: string;
  notes?: string;
  bank_account_id?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  expense_categories?: ExpenseCategory;
}

export interface RentContract {
  id: string;
  property_name: string;
  landlord_name: string;
  landlord_phone?: string;
  monthly_rent: number;
  currency: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_duration_months: number;
  security_deposit: number;
  commission_rate?: number;
  payment_day_of_month: number;
  payment_method: string;
  bank_account_id?: string;
  contract_notes?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  contract_number?: string;
  property_address?: string;
  end_date?: string;
}

export interface RentPayment {
  id: string;
  contract_id: string;
  payment_month: string;
  amount: number;
  currency: string;
  amount_egp?: number;
  exchange_rate?: number;
  payment_date?: string;
  due_date: string;
  status: string;
  payment_method?: string;
  bank_account_id?: string;
  reference_number?: string;
  late_fee?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlySalary {
  id: string;
  employee_id: string;
  salary_month: string;
  base_salary: number;
  allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  bonus: number;
  deductions: number;
  gross_salary: number;
  tax_amount: number;
  insurance_deduction: number;
  net_salary: number;
  attendance_days?: number;
  absence_days?: number;
  late_hours?: number;
  currency?: string;
  exchange_rate?: number;
  net_salary_egp?: number;
  payment_date?: string;
  payment_method?: string;
  bank_account_id?: string;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// إضافة نوع جديد لفترات العمولات المجمعة
export interface EmployeeCommissionPeriod {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_bookings_count: number;
  total_booking_amount: number;
  total_supplier_cost: number;
  total_profit: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  bank_account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

// إضافة نوع لتفاصيل الحجوزات والربح
export interface BookingProfitDetail {
  booking_type: 'hotel' | 'flight' | 'transport' | 'car_rental';
  booking_id: string;
  booking_amount: number;
  supplier_cost: number;
  profit: number;
  booking_date: string;
}
