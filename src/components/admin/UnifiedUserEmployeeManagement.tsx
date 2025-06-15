
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Link, 
  Unlink, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar,
  Building,
  DollarSign,
  CreditCard,
  UserCheck,
  UserX,
  Edit
} from 'lucide-react';
import { useUnifiedUserEmployee } from '@/hooks/useUnifiedUserEmployee';
import { useAuth } from '@/hooks/useAuth';
import UnifiedEditDialog from './unified-management/UnifiedEditDialog';
import LinkEmployeeDialog from './unified-management/LinkEmployeeDialog';

const UnifiedUserEmployeeManagement = () => {
  const { isSuperAdmin } = useAuth();
  const {
    unifiedUsers,
    unlinkedEmployees,
    isLoading,
    linkUserToEmployee,
    unlinkUserFromEmployee,
    isLinking,
    isUnlinking,
  } = useUnifiedUserEmployee();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ليس لديك صلاحية</h3>
            <p className="text-gray-600">هذه الميزة متاحة للسوبر أدمن فقط</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // فلترة المستخدمين
  const filteredUsers = unifiedUsers?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  }) || [];

  const handleLinkEmployee = (userId: string, employeeId: string) => {
    linkUserToEmployee({ userId, employeeId });
    setIsLinkDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل البيانات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة المستخدمين والموظفين الموحدة</h2>
          <p className="text-gray-600">نظام شامل لإدارة حسابات المستخدمين وبيانات الموظفين</p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {unifiedUsers?.length || 0} مستخدم
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {unifiedUsers?.filter(u => u.employee).length || 0} موظف مرتبط
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <UserX className="h-3 w-3" />
            {unlinkedEmployees?.length || 0} موظف غير مرتبط
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المستخدمين والموظفين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأدوار</option>
              <option value="super_admin">سوبر أدمن</option>
              <option value="admin">أدمن</option>
              <option value="manager">مدير</option>
              <option value="sales_agent">مندوب مبيعات</option>
              <option value="accountant">محاسب</option>
              <option value="viewer">مشاهد</option>
              <option value="no_role">بدون دور</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
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
                    {user.role === 'super_admin' ? 'سوبر أدمن' :
                     user.role === 'admin' ? 'أدمن' :
                     user.role === 'manager' ? 'مدير' :
                     user.role === 'sales_agent' ? 'مندوب مبيعات' :
                     user.role === 'accountant' ? 'محاسب' :
                     user.role === 'viewer' ? 'مشاهد' : 'بدون دور'}
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

              {/* بيانات الموظف (إذا كان مرتبطاً) */}
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
                  onClick={() => {
                    setSelectedUser(user);
                    setIsEditDialogOpen(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  تعديل
                </Button>
                
                {user.employee ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unlinkUserFromEmployee(user.id)}
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
                    onClick={() => {
                      setSelectedUser(user);
                      setIsLinkDialogOpen(true);
                    }}
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
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600">لم يتم العثور على مستخدمين يطابقون معايير البحث</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {selectedUser && (
        <UnifiedEditDialog
          user={selectedUser}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Link Employee Dialog */}
      {selectedUser && (
        <LinkEmployeeDialog
          user={selectedUser}
          unlinkedEmployees={unlinkedEmployees || []}
          isOpen={isLinkDialogOpen}
          onOpenChange={setIsLinkDialogOpen}
          onLink={handleLinkEmployee}
        />
      )}
    </div>
  );
};

export default UnifiedUserEmployeeManagement;
