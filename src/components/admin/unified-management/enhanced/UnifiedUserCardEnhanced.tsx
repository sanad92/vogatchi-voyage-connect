
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Building, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Edit, Link, Unlink, Trash2, Shield } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEmployeeActionsOptimized } from '@/hooks/useEmployeeActionsOptimized';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import ToggleEmployeeStatusDialog from '@/components/expenses/employee-management/dialogs/ToggleEmployeeStatusDialog';
import DeleteEmployeeDialog from '@/components/expenses/employee-management/dialogs/DeleteEmployeeDialog';

interface UnifiedUserCardEnhancedProps {
  user: any;
  onEdit: (user: any) => void;
  onLink: (user: any) => void;
  onUnlink: (userId: string) => void;
  isLinking: boolean;
  isUnlinking: boolean;
}

const UnifiedUserCardEnhanced = ({ 
  user, 
  onEdit, 
  onLink, 
  onUnlink, 
  isLinking, 
  isUnlinking 
}: UnifiedUserCardEnhancedProps) => {
  const { isSuperAdmin } = useOptimizedAuth();
  const { 
    isLoading: isLoadingFn, 
    toggleEmployeeStatus, 
    deleteEmployee, 
    checkEmployeeDeletion,
    canDelete 
  } = useEmployeeActionsOptimized();
  const isLoading = typeof isLoadingFn === 'function' ? isLoadingFn() : !!isLoadingFn;

  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleToggleStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    await toggleEmployeeStatus(employeeId, isActive, reason);
  };

  const handleDeleteEmployee = async (employeeId: string, forceDelete?: boolean, reason?: string) => {
    await deleteEmployee(employeeId, forceDelete, reason);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      case 'viewer': return 'مشاهد';
      default: return 'بدون دور';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'sales_agent': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'accountant': return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      case 'viewer': return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
      default: return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
    }
  };

  return (
    <>
      <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
                  {user.full_name}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  انضم في {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant={user.is_active ? "default" : "secondary"}
                className={`transition-all duration-200 ${user.is_active ? 'animate-pulse bg-green-500 hover:bg-green-600' : ''}`}
              >
                {user.is_active ? 'نشط' : 'معطل'}
              </Badge>
              <Badge className={`${getRoleBadgeColor(user.role)} border-0 shadow-sm`}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* User Info Section */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30">
            <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              بيانات الحساب
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail className="h-3 w-3 text-blue-500" />
                <span className="break-all">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Phone className="h-3 w-3 text-green-500" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Building className="h-3 w-3 text-purple-500" />
                  <span>{user.department}</span>
                </div>
              )}
            </div>
          </div>

          {/* Employee Info Section */}
          {user.employee ? (
            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/30">
              <h4 className="font-semibold text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                بيانات الموظف
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="font-medium">الكود:</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-mono">
                    {user.employee.employee_code}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="font-medium">المنصب:</span>
                  <span>{user.employee.position}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-3 w-3 text-orange-500" />
                  <span>{new Date(user.employee.hire_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {(user.employee.base_salary + user.employee.allowances).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-100 dark:border-orange-800/30 text-center">
              <User className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                غير مرتبط بموظف
              </p>
            </div>
          )}

          {/* Actions Section */}
          <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            {/* زر الحذف المنفصل - يظهر فقط إذا كان مرتبط بموظف وللسوبر أدمن */}
            {user.employee && canDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
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

            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(user)}
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 group"
            >
              <Edit className="h-3 w-3 group-hover:scale-110 transition-transform" />
              تعديل
            </Button>
            
            {user.employee ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnlink(user.id)}
                disabled={isUnlinking}
                className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 transition-all duration-200 group disabled:opacity-50"
              >
                <Unlink className="h-3 w-3 group-hover:scale-110 transition-transform" />
                {isUnlinking ? 'جاري الإلغاء...' : 'إلغاء الربط'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLink(user)}
                disabled={isLinking}
                className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-all duration-200 group disabled:opacity-50"
              >
                <Link className="h-3 w-3 group-hover:scale-110 transition-transform" />
                {isLinking ? 'جاري الربط...' : 'ربط موظف'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* حوارات التأكيد - تظهر فقط إذا كان المستخدم مرتبط بموظف */}
      {user.employee && (
        <>
          <ToggleEmployeeStatusDialog
            isOpen={isToggleDialogOpen}
            onOpenChange={setIsToggleDialogOpen}
            employee={user.employee}
            onConfirm={handleToggleStatus}
            isLoading={isLoading}
          />

          <DeleteEmployeeDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            employee={user.employee}
            onConfirm={handleDeleteEmployee}
            onCheckDeletion={checkEmployeeDeletion}
            isLoading={isLoading}
          />
        </>
      )}
    </>
  );
};

export default UnifiedUserCardEnhanced;
