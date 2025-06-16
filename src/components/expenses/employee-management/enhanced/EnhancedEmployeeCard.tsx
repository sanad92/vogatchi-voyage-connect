
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  MoreVertical,
  Link,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  Eye,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { useEmployeeActions } from '@/hooks/useEmployeeActions';
import { useAuth } from '@/hooks/useAuth';
import ToggleEmployeeStatusDialog from '../dialogs/ToggleEmployeeStatusDialog';
import DeleteEmployeeDialog from '../dialogs/DeleteEmployeeDialog';

interface EnhancedEmployeeCardProps {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    position: string;
    department: string;
    phone?: string;
    email?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    is_active: boolean;
    linkedToUser: boolean;
    userId?: string;
  };
  onLinkEmployee?: (employeeId: string) => void;
}

const EnhancedEmployeeCard = ({ employee, onLinkEmployee }: EnhancedEmployeeCardProps) => {
  const { hasRole, isSuperAdmin } = useAuth();
  const { 
    isLoading, 
    toggleEmployeeStatus, 
    deleteEmployee, 
    checkEmployeeDeletion,
    canToggleStatus,
    canDelete 
  } = useEmployeeActions();

  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleToggleStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    await toggleEmployeeStatus(employeeId, isActive, reason);
  };

  const handleDeleteEmployee = async (employeeId: string, forceDelete?: boolean, reason?: string) => {
    await deleteEmployee(employeeId, forceDelete, reason);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-200 ${
        !employee.is_active ? 'opacity-75 border-red-200' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                employee.is_active ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <User className={`h-6 w-6 ${
                  employee.is_active ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                <p className="text-sm text-gray-600">
                  {employee.employee_code} | {employee.position}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* شارة الحالة */}
              <Badge variant={employee.is_active ? "default" : "secondary"}>
                {employee.is_active ? 'نشط' : 'معطل'}
              </Badge>
              
              {/* شارة الربط */}
              {employee.linkedToUser && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Link className="h-3 w-3 mr-1" />
                  مرتبط
                </Badge>
              )}

              {/* زر الحذف المنفصل - يظهر فقط للسوبر أدمن */}
              {canDelete && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
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
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                  
                  {(hasRole('admin') || hasRole('manager') || isSuperAdmin()) && (
                    <>
                      <DropdownMenuItem>
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
                      onClick={() => setIsToggleDialogOpen(true)}
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
                        onClick={() => setIsDeleteDialogOpen(true)}
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
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* تحذير للموظفين مع ارتباطات (إذا كان سوبر أدمن) */}
          {canDelete && employee.linkedToUser && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
              <div className="flex items-center gap-2 text-orange-700 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>قد يحتاج حذف إجباري بسبب الارتباطات</span>
              </div>
            </div>
          )}

          {/* معلومات الاتصال */}
          <div className="space-y-2">
            {employee.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{employee.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>تاريخ التوظيف: {formatDate(employee.hire_date)}</span>
            </div>
          </div>

          {/* معلومات القسم */}
          {employee.department && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">القسم: </span>
              <span className="text-gray-600">{employee.department}</span>
            </div>
          )}

          {/* معلومات الراتب */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">الراتب الأساسي:</span>
              <span className="font-medium">{formatCurrency(employee.base_salary)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">البدلات:</span>
              <span className="font-medium">{formatCurrency(employee.allowances)}</span>
            </div>
            {employee.commission_rate && employee.commission_rate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">نسبة العمولة:</span>
                <span className="font-medium text-green-600">
                  {employee.commission_rate}%
                </span>
              </div>
            )}
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">إجمالي الراتب:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(employee.base_salary + employee.allowances)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حوارات التأكيد */}
      <ToggleEmployeeStatusDialog
        isOpen={isToggleDialogOpen}
        onOpenChange={setIsToggleDialogOpen}
        employee={employee}
        onConfirm={handleToggleStatus}
        isLoading={isLoading}
      />

      <DeleteEmployeeDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        employee={employee}
        onConfirm={handleDeleteEmployee}
        onCheckDeletion={checkEmployeeDeletion}
        isLoading={isLoading}
      />
    </>
  );
};

export default EnhancedEmployeeCard;
