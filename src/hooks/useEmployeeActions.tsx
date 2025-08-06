
import { useEmployeeActionsOptimized } from '@/hooks/useEmployeeActionsOptimized';

// Compatibility wrapper to unify on the optimized implementation while keeping the same API
// This preserves existing imports and prop expectations (e.g., boolean isLoading)
export const useEmployeeActions = () => {
  const optimized = useEmployeeActionsOptimized();

  // Map optimized API to legacy shape
  const {
    updateEmployee,
    toggleEmployeeStatus,
    checkEmployeeDeletion,
    deleteEmployee,
    createEmployee,
    canToggleStatus,
    canDelete,
    canEdit,
    isLoading: isLoadingFn,
  } = optimized as any;

  // Legacy components expect a boolean isLoading
  const isLoading: boolean = typeof isLoadingFn === 'function' ? isLoadingFn() : !!isLoadingFn;

  return {
    // keep legacy keys
    isLoading,
    updateEmployee,
    toggleEmployeeStatus,
    checkEmployeeDeletion,
    deleteEmployee,
    // expose permissions with the same names
    canToggleStatus,
    canDelete,
    canEdit,
    // also expose the new createEmployee for future use without breaking anything
    createEmployee,
    // and pass-through access to the optimized API if needed
    __optimized: optimized,
  };
};
