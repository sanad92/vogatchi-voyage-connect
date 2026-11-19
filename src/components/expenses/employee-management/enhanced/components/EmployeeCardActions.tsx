import { Edit, Link as LinkIcon, MoreHorizontal, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface EmployeeCardActionsProps {
  employee: { id: string; linkedToUser: boolean; is_active: boolean; full_name: string };
  onLinkEmployee?: (employeeId: string) => void;
  onEditEmployee: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isLoading: boolean;
  canToggleStatus: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

export default function EmployeeCardActions({
  employee, onLinkEmployee, onEditEmployee, onToggleStatus, onDelete, isLoading, canToggleStatus, canDelete, canEdit,
}: EmployeeCardActionsProps) {
  const canLink = !employee.linkedToUser && Boolean(onLinkEmployee);
  if (!canEdit && !canToggleStatus && !canDelete && !canLink) return null;

  return <DropdownMenu dir="rtl">
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" disabled={isLoading} aria-label={`إجراءات ${employee.full_name}`}>
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {canEdit && <DropdownMenuItem onClick={onEditEmployee}><Edit className="me-2 h-4 w-4" /> تعديل البيانات</DropdownMenuItem>}
      {canLink && <DropdownMenuItem onClick={() => onLinkEmployee?.(employee.id)}><LinkIcon className="me-2 h-4 w-4" /> ربط بحساب</DropdownMenuItem>}
      {canToggleStatus && <DropdownMenuItem onClick={onToggleStatus}>
        {employee.is_active ? <><UserX className="me-2 h-4 w-4" /> إيقاف ملف الموظف</>
          : <><UserCheck className="me-2 h-4 w-4" /> تفعيل ملف الموظف</>}
      </DropdownMenuItem>}
      {canDelete && <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="me-2 h-4 w-4" /> حذف الموظف</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
