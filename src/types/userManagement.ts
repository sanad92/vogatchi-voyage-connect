
// Aligned with org_role enum: owner | admin | manager | agent | viewer
export type UserRole = "owner" | "admin" | "manager" | "agent" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
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
