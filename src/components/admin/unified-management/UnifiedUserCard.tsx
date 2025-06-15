
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar,
  Building,
  DollarSign,
  Link,
  Unlink,
  Edit
} from 'lucide-react';

interface UnifiedUserCardProps {
  user: any;
  onEdit: (user: any) => void;
  onLink: (user: any) => void;
  onUnlink: (userId: string) => void;
  isLinking: boolean;
  isUnlinking: boolean;
}

const UnifiedUserCard = ({ 
  user, 
  onEdit, 
  onLink, 
  onUnlink, 
  isLinking, 
  isUnlinking 
}: UnifiedUserCardProps) => {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {user.full_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={user.is_active ? "default" : "secondary"}>
              {user.is_active ? 'نشط' : 'معطل'}
            </Badge>
            <Badge variant="outline">
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* بيانات المستخدم */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">بيانات الحساب</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-gray-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.department && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3 text-gray-400" />
                <span>{user.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* بيانات الموظف */}
        {user.employee ? (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                بيانات الموظف
              </h4>
              <Badge variant="outline" className="text-green-600 border-green-600">
                مرتبط
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">رقم الموظف:</span>
                <span>{user.employee.employee_code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">المنصب:</span>
                <span>{user.employee.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span>التوظيف: {new Date(user.employee.hire_date).toLocaleDateString('ar')}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span>الراتب: {(user.employee.base_salary + user.employee.allowances).toLocaleString()} ج.م</span>
              </div>
              {user.employee.commission_rate > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">العمولة:</span>
                  <span>{user.employee.commission_rate}%</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">غير مرتبط بموظف</span>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                غير مرتبط
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(user)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            تعديل
          </Button>
          
          {user.employee ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUnlink(user.id)}
              disabled={isUnlinking}
              className="flex items-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <Unlink className="h-3 w-3" />
              إلغاء الربط
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLink(user)}
              disabled={isLinking}
              className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
            >
              <Link className="h-3 w-3" />
              ربط موظف
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedUserCard;
