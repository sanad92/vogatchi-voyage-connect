
import { type EnhancedEmployee } from '@/hooks/useEmployeeManagementData';

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
  const needle = searchTerm.trim().toLocaleLowerCase();
  const filteredEmployees = allEmployees.filter(employee => {
    // فلتر البحث
    const matchesSearch = [employee.full_name, employee.employee_code, employee.position, employee.department]
      .some(value => value?.toLocaleLowerCase().includes(needle));

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
