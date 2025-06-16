
import { useMemo, useState } from 'react';
import type { UnifiedUser } from './unified-data/types';

export const useUnifiedUserFilters = (users: UnifiedUser[] | undefined) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase());

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
