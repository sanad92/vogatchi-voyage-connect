
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
  Edit,
  Crown
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
  const { hasRole, isSuperAdmin, userRole } = useAuth();

  // تسجيل مفصل للصلاحيات على مستوى الإجراءات
  console.log('🎯 EmployeeCardActions - فحص الصلاحيات:', {
    employeeName: employee.full_name,
    employeeId: employee.id,
    userRole,
    isSuperAdmin: isSuperAdmin(),
    hasAdminRole: hasRole('admin'),
    hasManagerRole: hasRole('manager'),
    canToggleStatus,
    canDelete,
    canEdit,
    isLoading
  });

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
              className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white">
            <span>عرض التفاصيل</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* زر التعديل - للمدراء والأدمن والسوبر أدمن */}
      {canEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditEmployee}
                className={`h-8 w-8 p-0 transition-all duration-200 ${
                  isSuperAdmin() 
                    ? 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                    : 'border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300'
                }`}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className={isSuperAdmin() ? "bg-red-600 text-white" : "bg-green-600 text-white"}>
              <div className="flex items-center gap-1">
                {isSuperAdmin() && <Crown className="h-3 w-3" />}
                <span>تعديل البيانات</span>
                {isSuperAdmin() && <span>(سوبر أدمن)</span>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* زر الحذف المنفصل - يظهر فقط للسوبر أدمن */}
      {canDelete && isSuperAdmin() && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 ring-1 ring-red-100"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-red-600 text-white">
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <Shield className="h-3 w-3" />
                <span>حذف الموظف (سوبر أدمن فقط)</span>
              </div>
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
        <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border">
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

          {/* شارة الصلاحيات */}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            {isSuperAdmin() ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <Crown className="h-3 w-3" />
                سوبر أدمن
              </span>
            ) : hasRole('admin') ? (
              <span className="text-purple-600 font-medium">أدمن</span>
            ) : hasRole('manager') ? (
              <span className="text-blue-600 font-medium">مدير</span>
            ) : (
              <span className="text-gray-600">مستخدم</span>
            )}
          </DropdownMenuItem>

          {/* معلومات الصلاحيات المفصلة للسوبر أدمن */}
          {isSuperAdmin() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-gray-500">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    <span>تعديل: {canEdit ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    <span>حذف: {canDelete ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    <span>تفعيل/إيقاف: {canToggleStatus ? '✓' : '✗'}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EmployeeCardActions;
