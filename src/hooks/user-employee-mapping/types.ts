
export interface CurrentEmployeeData {
  id: string;
  full_name: string;
  employee_code: string;
  email: string;
  position?: string;
  is_active: boolean;
}

export interface UseCurrentEmployeeReturn {
  currentEmployee: CurrentEmployeeData | null;
  isLoading: boolean;
  error: string | null;
  getCurrentEmployeeName: () => string;
  getCurrentEmployeeId: () => string | null;
  refetchCurrentEmployee: () => Promise<void>;
}

export interface UseLinkingOperationsReturn {
  linkUserToEmployee: (employeeId: string) => Promise<boolean>;
}
