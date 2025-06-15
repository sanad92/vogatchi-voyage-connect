
export type UserRole = "admin" | "manager" | "sales_agent" | "accountant" | "viewer" | "super_admin" | "no_role";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string; // جعل phone اختياري ليتوافق مع UnifiedUser
  department?: string; // جعل department اختياري أيضاً
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
