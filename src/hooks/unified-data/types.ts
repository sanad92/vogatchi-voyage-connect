
export interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate: number;
    bank_name?: string;
    bank_account_number?: string;
    national_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
}

export interface UnlinkedEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  hire_date: string;
  base_salary: number;
  allowances: number;
  commission_rate: number;
  is_active: boolean;
}
