
import { useState, useMemo } from 'react';

interface UnifiedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee?: {
    employee_code: string;
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
