
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, Building, Calendar, DollarSign, 
  CreditCard, MapPin, UserCheck, Shield 
} from 'lucide-react';

interface ViewEmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    position: string;
    department: string;
    phone?: string;
    email?: string;
    national_id?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    is_active: boolean;
    bank_account_number?: string;
    bank_name?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    linkedToUser: boolean;
    user_full_name?: string;
  };
}

const ViewEmployeeDialog = ({ isOpen, onOpenChange, employee }: ViewEmployeeDialogProps) => {
  const totalSalary = employee.base_salary + employee.allowances;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            تفاصيل الموظف: {employee.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">كود الموظف</label>
                  <p className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {employee.employee_code}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">الحالة</label>
                  <div className="mt-1">
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">المنصب</label>
                  <p className="text-sm">{employee.position}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">القسم</label>
                  <p className="text-sm">{employee.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">تاريخ التوظيف</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(employee.hire_date).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                {employee.national_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">الرقم القومي</label>
                    <p className="text-sm font-mono">{employee.national_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.emergency_contact_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">جهة الاتصال في الطوارئ</label>
                    <div className="flex items-center gap-2 mt-1">
                      <UserCheck className="h-4 w-4 text-orange-600" />
                      <span>{employee.emergency_contact_name}</span>
                      {employee.emergency_contact_phone && (
                        <span className="text-gray-500">- {employee.emergency_contact_phone}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* المعلومات المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                المعلومات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">الراتب الأساسي</label>
                  <p className="text-lg font-bold text-green-600">
                    {employee.base_salary.toLocaleString()} ج.م
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">البدلات</label>
                  <p className="text-lg font-bold text-blue-600">
                    {employee.allowances.toLocaleString()} ج.م
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">إجمالي الراتب</label>
                  <p className="text-xl font-bold text-purple-600">
                    {totalSalary.toLocaleString()} ج.م
                  </p>
                </div>
                {employee.commission_rate && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">معدل العمولة</label>
                    <p className="text-lg font-bold text-orange-600">
                      {employee.commission_rate}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* المعلومات البنكية */}
          {(employee.bank_name || employee.bank_account_number) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  المعلومات البنكية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {employee.bank_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">اسم البنك</label>
                      <p className="text-sm">{employee.bank_name}</p>
                    </div>
                  )}
                  {employee.bank_account_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">رقم الحساب</label>
                      <p className="text-sm font-mono">{employee.bank_account_number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* معلومات الربط */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">مرتبط بمستخدم:</span>
                  <Badge variant={employee.linkedToUser ? "default" : "secondary"}>
                    {employee.linkedToUser ? 'نعم' : 'لا'}
                  </Badge>
                </div>
                {employee.linkedToUser && employee.user_full_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">اسم المستخدم:</span>
                    <span className="text-sm">{employee.user_full_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewEmployeeDialog;
