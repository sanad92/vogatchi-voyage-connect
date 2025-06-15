
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, Save, Users, Eye, Plus, X, Copy } from 'lucide-react';
import { useDetailedPermissions, DetailedUserPermissions } from '@/hooks/useDetailedPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import { toast } from 'sonner';

// تعريف الصلاحيات المجمعة حسب الفئة
const PERMISSION_CATEGORIES = [
  {
    key: 'customers',
    name: 'إدارة العملاء',
    icon: '👥',
    color: 'bg-green-100 text-green-800',
    permissions: [
      { key: 'customers_view', name: 'عرض العملاء' },
      { key: 'customers_create', name: 'إضافة عملاء' },
      { key: 'customers_edit', name: 'تعديل العملاء' },
      { key: 'customers_delete', name: 'حذف العملاء' },
      { key: 'customers_export', name: 'تصدير البيانات' },
    ]
  },
  {
    key: 'bookings',
    name: 'إدارة الحجوزات',
    icon: '📅',
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      { key: 'bookings_view', name: 'عرض الحجوزات' },
      { key: 'bookings_create', name: 'إنشاء حجوزات' },
      { key: 'bookings_edit', name: 'تعديل الحجوزات' },
      { key: 'bookings_delete', name: 'حذف الحجوزات' },
      { key: 'bookings_cancel', name: 'إلغاء الحجوزات' },
      { key: 'bookings_confirm', name: 'تأكيد الحجوزات' },
    ]
  },
  {
    key: 'invoices',
    name: 'إدارة الفواتير',
    icon: '📋',
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      { key: 'invoices_view', name: 'عرض الفواتير' },
      { key: 'invoices_create', name: 'إنشاء فواتير' },
      { key: 'invoices_edit', name: 'تعديل الفواتير' },
      { key: 'invoices_delete', name: 'حذف الفواتير' },
      { key: 'invoices_send', name: 'إرسال الفواتير' },
      { key: 'invoices_payment', name: 'إدارة المدفوعات' },
    ]
  },
  {
    key: 'suppliers',
    name: 'إدارة الموردين',
    icon: '🏢',
    color: 'bg-orange-100 text-orange-800',
    permissions: [
      { key: 'suppliers_view', name: 'عرض الموردين' },
      { key: 'suppliers_create', name: 'إضافة موردين' },
      { key: 'suppliers_edit', name: 'تعديل الموردين' },
      { key: 'suppliers_delete', name: 'حذف الموردين' },
      { key: 'suppliers_contracts', name: 'إدارة العقود' },
    ]
  },
  {
    key: 'reports',
    name: 'التقارير والإحصائيات',
    icon: '📊',
    color: 'bg-red-100 text-red-800',
    permissions: [
      { key: 'reports_financial', name: 'التقارير المالية' },
      { key: 'reports_sales', name: 'تقارير المبيعات' },
      { key: 'reports_operational', name: 'التقارير التشغيلية' },
      { key: 'reports_export', name: 'تصدير التقارير' },
      { key: 'reports_advanced', name: 'التحليلات المتقدمة' },
    ]
  },
  {
    key: 'employees',
    name: 'إدارة الموظفين',
    icon: '👨‍💼',
    color: 'bg-yellow-100 text-yellow-800',
    permissions: [
      { key: 'employees_view', name: 'عرض الموظفين' },
      { key: 'employees_create', name: 'إضافة موظفين' },
      { key: 'employees_edit', name: 'تعديل الموظفين' },
      { key: 'employees_delete', name: 'حذف الموظفين' },
      { key: 'employees_salary', name: 'إدارة الرواتب' },
      { key: 'employees_commission', name: 'إدارة العمولات' },
    ]
  },
  {
    key: 'expenses',
    name: 'إدارة المصروفات',
    icon: '💰',
    color: 'bg-pink-100 text-pink-800',
    permissions: [
      { key: 'expenses_view', name: 'عرض المصروفات' },
      { key: 'expenses_create', name: 'إضافة مصروفات' },
      { key: 'expenses_approve', name: 'اعتماد المصروفات' },
      { key: 'expenses_reports', name: 'تقارير المصروفات' },
    ]
  },
  {
    key: 'system',
    name: 'إدارة النظام',
    icon: '⚙️',
    color: 'bg-gray-100 text-gray-800',
    permissions: [
      { key: 'system_users', name: 'إدارة المستخدمين' },
      { key: 'system_settings', name: 'إعدادات النظام' },
      { key: 'system_backup', name: 'النسخ الاحتياطي' },
      { key: 'system_audit', name: 'سجلات المراجعة' },
    ]
  },
  {
    key: 'banking',
    name: 'الحسابات البنكية',
    icon: '🏦',
    color: 'bg-indigo-100 text-indigo-800',
    permissions: [
      { key: 'banking_view', name: 'عرض الحسابات' },
      { key: 'banking_transactions', name: 'المعاملات البنكية' },
      { key: 'banking_transfer', name: 'التحويلات البنكية' },
    ]
  },
];

const DetailedPermissionsMatrix = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Partial<DetailedUserPermissions>>({});

  const { unifiedUsers, isLoading: usersLoading } = useUnifiedData();
  const { allUserPermissions, updatePermissions, applyPermissionTemplate, isUpdating } = useDetailedPermissions();

  // فلترة المستخدمين
  const filteredUsers = unifiedUsers?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // الحصول على صلاحيات مستخدم معين
  const getUserPermissions = (userId: string) => {
    return allUserPermissions?.find(perm => perm.user_id === userId);
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
    
    updatePermissions({
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

  // تفعيل/إلغاء جميع صلاحيات فئة معينة
  const toggleCategoryPermissions = (categoryKey: string, enabled: boolean) => {
    const category = PERMISSION_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) return;

    const updates: any = {};
    category.permissions.forEach(permission => {
      updates[permission.key] = enabled;
    });

    setTempPermissions(prev => ({
      ...prev,
      ...updates
    }));
  };

  // تطبيق قالب صلاحيات
  const handleApplyTemplate = async (userId: string, templateName: string) => {
    await applyPermissionTemplate(userId, templateName);
    toast.success(`تم تطبيق قالب ${templateName} بنجاح`);
  };

  // الحصول على قيمة صلاحية
  const getPermissionValue = (userId: string, permissionKey: string): boolean => {
    if (editingUser === userId) {
      return Boolean(tempPermissions[permissionKey as keyof DetailedUserPermissions]);
    }
    
    const userPerms = getUserPermissions(userId);
    return Boolean(userPerms?.[permissionKey as keyof DetailedUserPermissions]);
  };

  // فلترة الفئات
  const filteredCategories = selectedCategory === 'all' 
    ? PERMISSION_CATEGORIES 
    : PERMISSION_CATEGORIES.filter(cat => cat.key === selectedCategory);

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
      {/* شريط البحث والفلاتر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إدارة الصلاحيات المفصلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="فلترة حسب الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {PERMISSION_CATEGORIES.map(category => (
                  <SelectItem key={category.key} value={category.key}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {filteredUsers.length} مستخدم
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* جدول الصلاحيات */}
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
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                    <Badge variant="outline">
                      {user.role || 'بدون دور'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* قوالب سريعة */}
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
                        <div key={permission.key} className="flex items-center space-x-2 rtl:space-x-reverse">
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد نتائج
            </h3>
            <p className="text-gray-600">
              لم يتم العثور على مستخدمين يطابقون البحث الحالي
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DetailedPermissionsMatrix;
