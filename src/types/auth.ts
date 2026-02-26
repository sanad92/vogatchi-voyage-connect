
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee_id?: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp?: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  setOrgRole: (role: string | null) => void;
  isSuperAdmin: () => boolean;
  isLoggedIn: () => boolean;
  canDelete: () => boolean;
  canEditAll: () => boolean;
  canManageSystemSettings: () => boolean;
  forceResetAuth?: () => Promise<void>;
}
