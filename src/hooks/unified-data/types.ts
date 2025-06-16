
// Response types for database functions
export interface LinkUserToEmployeeResponse {
  success: boolean;
  error?: string;
  message: string;
  user_id?: string;
  employee_id?: string;
  sqlstate?: string;
}

export interface UnlinkUserFromEmployeeResponse {
  success: boolean;
  error?: string;
  message: string;
  user_id?: string;
  sqlstate?: string;
}

// Existing types
export interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  department?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_code: string;
    full_name: string;
    position: string;
    department: string;
    national_id?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number; // جعلها optional
    bank_account_number?: string;
    bank_name?: string;
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
  commission_rate?: number;
  is_active: boolean;
}
