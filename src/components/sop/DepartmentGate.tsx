import { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useMyDepartments } from '@/hooks/useSop';
import { DEPARTMENT_LABELS, type SopDepartment } from '@/lib/sop';

interface Props {
  department: SopDepartment;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * Departmental gate. Managers, admins and owners always pass — everyone else
 * must be a member of the department in the SOP department registry.
 */
export const DepartmentGate = ({ department, children, fallback, showMessage = true }: Props) => {
  const { has, isLoading } = useMyDepartments();
  if (isLoading) return null;
  if (has(department)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  if (!showMessage) return null;
  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertDescription>
        هذا الإجراء مخصص لقسم {DEPARTMENT_LABELS[department]} حسب دليل العمل المعتمد.
      </AlertDescription>
    </Alert>
  );
};

export default DepartmentGate;
