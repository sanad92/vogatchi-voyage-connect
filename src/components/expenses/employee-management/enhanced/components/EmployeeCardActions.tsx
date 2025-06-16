
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreVertical,
  Link,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeCardActionsProps {
  employee: {
    id: string;
    linkedToUser: boolean;
    is_active: boolean;
    full_name: string;
  };
  onLinkEmployee?: (employeeId: string) => void;
  onViewDetails: () => void;
  onEditEmployee: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isLoading: boolean;
  canToggleStatus: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

const EmployeeCardActions = ({ 
  employee, 
  onLinkEmployee, 
  onViewDetails,
  onEditEmployee,
  onToggleStatus, 
  onDelete, 
  isLoading, 
  canToggleStatus, 
  canDelete,
  canEdit
}: EmployeeCardActionsProps) => {
  const { hasRole, isSuperAdmin } = useAuth();

  return (
    <div className="flex items-center gap-2">
      {/* زر عرض التفاصيل */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>عرض التفاصيل</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* زر التعديل */}
      {canEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditEmployee}
                className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                disabled={isLoading}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>تعديل البيانات</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* زر الحذف - للسوبر أدمن فقط */}
      {canDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>حذف الموظف</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* قائمة الإجراءات الإضافية */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* ربط بمستخدم */}
          {!employee.linkedToUser && onLinkEmployee && (
            <>
              <DropdownMenuItem onClick={() => onLinkEmployee(employee.id)}>
                <Link className="h-4 w-4 mr-2" />
                ربط بمستخدم
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* تفعيل/إيقاف */}
          {canToggleStatus && (
            <DropdownMenuItem 
              onClick={onToggleStatus}
              className={employee.is_active ? 'text-orange-600' : 'text-green-600'}
            >
              {employee.is_active ? (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  إيقاف الموظف
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  تفعيل الموظف
                </>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EmployeeCardActions;
