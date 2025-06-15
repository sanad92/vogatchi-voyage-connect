
import { useState, useMemo } from 'react';

interface UnifiedUser {
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

export const useUnifiedUserFilters = (users: UnifiedUser[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  return {
    searchTerm,
    selectedRole,
    filteredUsers,
    setSearchTerm,
    setSelectedRole,
  };
};
