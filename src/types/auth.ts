import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  employee_id?: string | null; // إضافة employee_id
}

export interface UserRole {
  role: 'admin' | 'manager' | 'sales_agent' | 'accountant' | 'viewer' | 'super_admin';
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
  isLoggedIn: () => boolean;
  canDelete: () => boolean;
  canEditAll: () => boolean;
  canManageSystemSettings: () => boolean;
}
