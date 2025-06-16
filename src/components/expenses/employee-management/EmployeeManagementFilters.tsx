
import { useEmployeeManagementData, type EnhancedEmployee } from '@/hooks/useEmployeeManagementData';

interface EmployeeManagementFiltersProps {
  allEmployees: EnhancedEmployee[];
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  linkedFilter: 'all' | 'linked' | 'unlinked';
}

export const useEmployeeFiltering = ({
  allEmployees,
  searchTerm,
  statusFilter,
  linkedFilter
}: EmployeeManagementFiltersProps) => {
  const filteredEmployees = allEmployees.filter(employee => {
    // فلتر البحث
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    // فلتر الحالة
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.is_active) ||
      (statusFilter === 'inactive' && !employee.is_active);
    
    // فلتر الربط
    const matchesLinked = linkedFilter === 'all' ||
      (linkedFilter === 'linked' && employee.linkedToUser) ||
      (linkedFilter === 'unlinked' && !employee.linkedToUser);
    
    return matchesSearch && matchesStatus && matchesLinked;
  });

  return { filteredEmployees };
};
