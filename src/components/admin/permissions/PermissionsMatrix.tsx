
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Save, Users } from 'lucide-react';
import { useUserPermissions, UserPermissions } from '@/hooks/useUserPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';

// تعريف الصلاحيات المتاحة
const PERMISSION_MODULES = [
  { key: 'customers', name: 'العملاء', icon: '👥' },
  { key: 'bookings', name: 'الحجوزات', icon: '📅' },
  { key: 'suppliers', name: 'الموردين', icon: '🏢' },
  { key: 'invoices', name: 'الفواتير', icon: '📋' },
  { key: 'reports', name: 'التقارير', icon: '📊' },
  { key: 'employees', name: 'الموظفين', icon: '👨‍💼' },
  { key: 'expenses', name: 'المصروفات', icon: '💰' },
  { key: 'users', name: 'إدارة المستخدمين', icon: '🔐' },
  { key: 'settings', name: 'إعدادات النظام', icon: '⚙️' },
];

const PermissionsMatrix = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Partial<UserPermissions>>({});

  const { unifiedUsers, isLoading: usersLoading } = useUnifiedData();
  const { allPermissions, updatePermissions, isUpdating } = useUserPermissions();

  // فلترة المستخدمين
  const filteredUsers = unifiedUsers?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // الحصول على صلاحيات مستخدم معين
  const getUserPermissions = (userId: string) => {
    return allPermissions?.find(perm => perm.user_id === userId);
  };

  // بدء تعديل صلاحيات مستخدم
  const startEditing = (userId: string) => {
    const currentPermissions = getUserPermissions(userId);
    setEditingUser(userId);
    setTempPermissions(currentPermissions || {});
  };

  // إلغاء التعديل
  const cancelEditing = () => {
    setEditingUser(null);
    setTempPermissions({});
  };

  // حفظ التغييرات
  const savePermissions = async () => {
    if (!editingUser) return;
    
    await updatePermissions({
      userId: editingUser,
      permissions: tempPermissions
    });
    
    setEditingUser(null);
    setTempPermissions({});
  };

  // تحديث صلاحية محددة
  const updatePermission = (permissionKey: string, value: boolean) => {
    setTempPermissions(prev => ({
      ...prev,
      [permissionKey]: value
    }));
  };

  // الحصول على قيمة صلاحية
  const getPermissionValue = (userId: string, permissionKey: string) => {
    if (editingUser === userId) {
      return tempPermissions[permissionKey as keyof UserPermissions] || false;
    }
    
    const userPerms = getUserPermissions(userId);
    return userPerms?.[permissionKey as keyof UserPermissions] || false;
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">جاري تحميل بيانات المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            مصفوفة الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {filteredUsers.length} مستخدم
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* مصفوفة الصلاحيات */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right p-4 font-medium min-w-[200px] sticky right-0 bg-gray-50">
                    المستخدم
                  </th>
                  {PERMISSION_MODULES.map(module => (
                    <th key={module.key} className="text-center p-2 font-medium min-w-[120px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-lg">{module.icon}</span>
                          <span className="text-sm">{module.name}</span>
                        </div>
                        <div className="flex justify-center gap-2 text-xs text-gray-500">
                          <span>قراءة</span>
                          <span>كتابة</span>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-4 font-medium min-w-[100px]">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    {/* معلومات المستخدم */}
                    <td className="p-4 sticky right-0 bg-white">
                      <div className="space-y-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={user.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {user.is_active ? 'نشط' : 'معطل'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {user.role || 'بدون دور'}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* صلاحيات الوحدات */}
                    {PERMISSION_MODULES.map(module => (
                      <td key={module.key} className="p-2 text-center">
                        <div className="flex justify-center gap-3">
                          {/* صلاحية القراءة */}
                          <Checkbox
                            checked={getPermissionValue(user.id, `${module.key}_read`)}
                            onCheckedChange={(checked) => {
                              if (editingUser === user.id) {
                                updatePermission(`${module.key}_read`, checked as boolean);
                              }
                            }}
                            disabled={editingUser !== user.id}
                            className="scale-75"
                          />
                          {/* صلاحية الكتابة */}
                          <Checkbox
                            checked={getPermissionValue(user.id, `${module.key}_write`)}
                            onCheckedChange={(checked) => {
                              if (editingUser === user.id) {
                                updatePermission(`${module.key}_write`, checked as boolean);
                              }
                            }}
                            disabled={editingUser !== user.id}
                            className="scale-75"
                          />
                        </div>
                      </td>
                    ))}

                    {/* أزرار الإجراءات */}
                    <td className="p-4 text-center">
                      {editingUser === user.id ? (
                        <div className="flex justify-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={savePermissions}
                            disabled={isUpdating}
                            className="flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            حفظ
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={isUpdating}
                          >
                            إلغاء
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => startEditing(user.id)}
                          className="flex items-center gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          تعديل
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا توجد نتائج
              </h3>
              <p className="text-gray-600">
                لم يتم العثور على مستخدمين يطابقون البحث الحالي
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* شرح المصطلحات */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">شرح الصلاحيات:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><strong>قراءة:</strong> يمكن للمستخدم عرض البيانات فقط</li>
                <li><strong>كتابة:</strong> يمكن للمستخدم إضافة وتعديل وحذف البيانات</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">ملاحظات:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• السوبر أدمن له صلاحية كاملة على كل شيء</li>
                <li>• صلاحية الكتابة تتضمن صلاحية القراءة تلقائياً</li>
                <li>• يجب حفظ التغييرات لتصبح سارية المفعول</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsMatrix;
