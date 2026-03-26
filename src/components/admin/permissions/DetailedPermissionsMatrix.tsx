import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Save, Plus, X } from 'lucide-react';
import { useDetailedPermissions, DetailedUserPermissions } from '@/hooks/useDetailedPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import MatrixSearchFilters from './matrix/MatrixSearchFilters';
import { PERMISSION_CATEGORIES } from './matrix/PermissionCategories';

const DetailedPermissionsMatrix = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Partial<DetailedUserPermissions>>({});

  const { unifiedUsers, isLoading: usersLoading } = useUnifiedData();
  const { allUserPermissions, updatePermissions, applyPermissionTemplate, isUpdating } =
    useDetailedPermissions();

  const filteredUsers =
    unifiedUsers?.filter((user) => {
      const normalizedSearch = searchTerm.toLowerCase();
      return (
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      );
    }) ?? [];

  const getUserPermissions = (userId: string) =>
    allUserPermissions?.find((permissions) => permissions.user_id === userId) ?? null;

  const startEditing = (userId: string) => {
    const currentPermissions = getUserPermissions(userId);
    setEditingUser(userId);
    setTempPermissions(currentPermissions ?? {});
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setTempPermissions({});
  };

  const savePermissions = async () => {
    if (!editingUser) return;

    await updatePermissions({
      userId: editingUser,
      permissions: tempPermissions,
    });

    setEditingUser(null);
    setTempPermissions({});
  };

  const updatePermission = (permissionKey: string, value: boolean) => {
    setTempPermissions((previous) => ({
      ...previous,
      [permissionKey]: value,
    }));
  };

  const toggleCategoryPermissions = (categoryKey: string, enabled: boolean) => {
    const category = PERMISSION_CATEGORIES.find((item) => item.key === categoryKey);
    if (!category) return;

    const updates: Record<string, boolean> = {};
    category.permissions.forEach((permission) => {
      updates[permission.key] = enabled;
    });

    setTempPermissions((previous) => ({
      ...previous,
      ...updates,
    }));
  };

  const handleApplyTemplate = async (userId: string, templateName: string) => {
    await applyPermissionTemplate(userId, templateName);
  };

  const getPermissionValue = (userId: string, permissionKey: string): boolean => {
    if (editingUser === userId) {
      return Boolean(tempPermissions[permissionKey as keyof DetailedUserPermissions]);
    }

    const userPermissions = getUserPermissions(userId);
    return Boolean(userPermissions?.[permissionKey as keyof DetailedUserPermissions]);
  };

  const filteredCategories =
    selectedCategory === 'all'
      ? PERMISSION_CATEGORIES
      : PERMISSION_CATEGORIES.filter((category) => category.key === selectedCategory);

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">جاري تحميل الصلاحيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إدارة الصلاحيات المفصلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MatrixSearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredUsersCount={filteredUsers.length}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{user.full_name}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                    <Badge variant="outline">{user.role || 'بدون دور'}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select onValueChange={(template) => handleApplyTemplate(user.id, template)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="تطبيق قالب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_agent">مندوب مبيعات</SelectItem>
                      <SelectItem value="accountant">محاسب</SelectItem>
                      <SelectItem value="manager">مدير</SelectItem>
                      <SelectItem value="viewer">مشاهد فقط</SelectItem>
                    </SelectContent>
                  </Select>

                  {editingUser === user.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={savePermissions} disabled={isUpdating}>
                        <Save className="h-4 w-4 mr-1" />
                        حفظ
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-1" />
                        إلغاء
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startEditing(user.id)}>
                      <Shield className="h-4 w-4 mr-1" />
                      تعديل الصلاحيات
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCategories.map((category) => (
                  <div key={category.key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <h4 className="font-medium text-sm">{category.name}</h4>
                      </div>
                      {editingUser === user.id && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategoryPermissions(category.key, true)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategoryPermissions(category.key, false)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-center space-x-2 rtl:space-x-reverse"
                        >
                          <Checkbox
                            checked={getPermissionValue(user.id, permission.key)}
                            onCheckedChange={(checked) => {
                              if (editingUser === user.id) {
                                updatePermission(permission.key, Boolean(checked));
                              }
                            }}
                            disabled={editingUser !== user.id}
                            className="scale-90"
                          />
                          <label className="text-xs text-gray-700 cursor-pointer">
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600">لم يتم العثور على مستخدمين يطابقون البحث الحالي</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DetailedPermissionsMatrix;
