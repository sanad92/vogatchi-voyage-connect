
export type UserRole = "admin" | "manager" | "sales_agent" | "accountant" | "viewer" | "super_admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  department: string;
  is_active: boolean;
  created_at: string;
  role?: UserRole;
}

export interface NewUser {
  email: string;
  full_name: string;
  phone: string;
  department: string;
  role: UserRole;
}
