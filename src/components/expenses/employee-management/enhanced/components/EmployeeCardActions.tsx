
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
  Shield,
  Eye,
  Edit
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeCardActionsProps {
  employee: {
    id: string;
    linkedToUser: boolean;
    is_active: boolean;
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
      {/* زر الحذف المنفصل - يظهر فقط للسوبر أدمن */}
      {canDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-red-600 text-white">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>حذف الموظف (سوبر أدمن)</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* قائمة الإجراءات */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            عرض التفاصيل
          </DropdownMenuItem>
          
          {canEdit && (
            <>
              <DropdownMenuItem onClick={onEditEmployee}>
                <Edit className="h-4 w-4 mr-2" />
                تعديل البيانات
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
            </>
          )}

          {/* ربط بمستخدم */}
          {!employee.linkedToUser && onLinkEmployee && (
            <DropdownMenuItem onClick={() => onLinkEmployee(employee.id)}>
              <Link className="h-4 w-4 mr-2" />
              ربط بمستخدم
            </DropdownMenuItem>
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

          {/* خيار حذف إضافي في القائمة للتأكيد */}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                حذف الموظف
              </DropdownMenuItem>
            </>
          )}

          {/* شارة السوبر أدمن */}
          {isSuperAdmin() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-red-600">
                <Shield className="h-3 w-3 mr-1" />
                سوبر أدمن
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EmployeeCardActions;
