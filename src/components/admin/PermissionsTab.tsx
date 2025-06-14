
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Shield, Plus, Edit, Save, Settings, Users, Eye, DollarSign } from "lucide-react";

interface Permission {
  id: string;
  role_name: string;
  permission_key: string;
  permission_value: boolean;
}

const PermissionsTab = () => {
  const queryClient = useQueryClient();
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>({});
  const [newPermission, setNewPermission] = useState({
    role_name: "",
    permission_key: "",
    permission_value: true
  });

  // جلب جميع الصلاحيات
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['custom-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_permissions')
        .select('*')
        .order('role_name', { ascending: true });
      
      if (error) throw error;
      return data as Permission[];
    }
  });

  // تحديث صلاحية
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('custom_permissions')
        .update({ permission_value: value })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-permissions'] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث الصلاحية بنجاح",
      });
    }
  });

  // إضافة صلاحية جديدة
  const addPermissionMutation = useMutation({
    mutationFn: async (permission: typeof newPermission) => {
      const { error } = await supabase
        .from('custom_permissions')
        .insert(permission);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-permissions'] });
      toast({
        title: "تم الإضافة",
        description: "تم إضافة الصلاحية الجديدة بنجاح",
      });
      setIsAddPermissionOpen(false);
      setNewPermission({ role_name: "", permission_key: "", permission_value: true });
    }
  });

  // تحديث مجموعة من الصلاحيات
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { id: string; value: boolean }[]) => {
      const promises = updates.map(({ id, value }) =>
        supabase
          .from('custom_permissions')
          .update({ permission_value: value })
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('فشل في تحديث بعض الصلاحيات');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-permissions'] });
      setEditingPermissions({});
      toast({
        title: "تم التحديث",
        description: "تم تحديث الصلاحيات بنجاح",
      });
    }
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      case 'viewer': return 'مشاهد';
      default: return role;
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      'can_manage_users': 'إدارة المستخدمين',
      'can_manage_settings': 'إدارة الإعدادات',
      'can_view_audit_logs': 'عرض سجل العمليات',
      'can_manage_roles': 'إدارة الأدوار',
      'can_access_all_data': 'الوصول لجميع البيانات',
      'can_view_reports': 'عرض التقارير',
      'can_manage_customers': 'إدارة العملاء',
      'can_manage_bookings': 'إدارة الحجوزات',
      'can_manage_suppliers': 'إدارة الموردين',
      'can_approve_invoices': 'الموافقة على الفواتير',
      'can_create_bookings': 'إنشاء حجوزات',
      'can_view_own_data': 'عرض البيانات الخاصة',
      'can_manage_invoices': 'إدارة الفواتير',
      'can_manage_payments': 'إدارة المدفوعات',
      'can_view_financial_reports': 'عرض التقارير المالية',
      'can_view_customers': 'عرض العملاء',
      'can_view_bookings': 'عرض الحجوزات'
    };
    return labels[permission] || permission;
  };

  const getCategoryIcon = (permission: string) => {
    if (permission.includes('user') || permission.includes('role')) return <Users className="h-4 w-4" />;
    if (permission.includes('financial') || permission.includes('payment') || permission.includes('invoice')) return <DollarSign className="h-4 w-4" />;
    if (permission.includes('setting')) return <Settings className="h-4 w-4" />;
    if (permission.includes('view')) return <Eye className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const handleBulkSave = () => {
    const updates = Object.entries(editingPermissions).map(([id, value]) => ({
      id,
      value
    }));
    bulkUpdateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // تجميع الصلاحيات حسب الدور
  const permissionsByRole = permissions?.reduce((acc, permission) => {
    if (!acc[permission.role_name]) {
      acc[permission.role_name] = [];
    }
    acc[permission.role_name].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  const roles = Object.keys(permissionsByRole);

  return (
    <div className="space-y-6">
      {/* شريط الإجراءات */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {Object.keys(editingPermissions).length > 0 && (
            <Button 
              onClick={handleBulkSave}
              disabled={bulkUpdateMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              حفظ التغييرات ({Object.keys(editingPermissions).length})
            </Button>
          )}
        </div>

        <Dialog open={isAddPermissionOpen} onOpenChange={setIsAddPermissionOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة صلاحية جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة صلاحية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role_name">الدور</Label>
                <select
                  id="role_name"
                  value={newPermission.role_name}
                  onChange={(e) => setNewPermission({ ...newPermission, role_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الدور</option>
                  <option value="admin">أدمن</option>
                  <option value="manager">مدير</option>
                  <option value="sales_agent">مندوب مبيعات</option>
                  <option value="accountant">محاسب</option>
                  <option value="viewer">مشاهد</option>
                </select>
              </div>
              <div>
                <Label htmlFor="permission_key">مفتاح الصلاحية</Label>
                <Input
                  id="permission_key"
                  value={newPermission.permission_key}
                  onChange={(e) => setNewPermission({ ...newPermission, permission_key: e.target.value })}
                  placeholder="مثل: can_manage_inventory"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newPermission.permission_value}
                  onCheckedChange={(checked) => setNewPermission({ ...newPermission, permission_value: checked })}
                />
                <Label>مفعل</Label>
              </div>
              <Button
                onClick={() => addPermissionMutation.mutate(newPermission)}
                disabled={addPermissionMutation.isPending || !newPermission.role_name || !newPermission.permission_key}
                className="w-full"
              >
                إضافة الصلاحية
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* عرض الصلاحيات */}
      {roles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صلاحيات</h3>
            <p className="text-gray-600 mb-4">لم يتم تعيين أي صلاحيات بعد</p>
            <Button onClick={() => setIsAddPermissionOpen(true)}>
              إضافة صلاحية جديدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={roles[0]} className="space-y-6">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${roles.length}, 1fr)` }}>
            {roles.map((role) => (
              <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {getRoleLabel(role)}
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {permissionsByRole[role].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {roles.map((role) => (
            <TabsContent key={role} value={role}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    صلاحيات {getRoleLabel(role)}
                    <span className="text-sm text-gray-500">({permissionsByRole[role].length} صلاحية)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissionsByRole[role].map((permission) => {
                      const isEdited = editingPermissions.hasOwnProperty(permission.id);
                      const currentValue = isEdited ? editingPermissions[permission.id] : permission.permission_value;
                      
                      return (
                        <div
                          key={permission.id}
                          className={`p-4 border rounded-lg transition-all ${
                            isEdited ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(permission.permission_key)}
                              <div className="font-medium text-sm">
                                {getPermissionLabel(permission.permission_key)}
                              </div>
                            </div>
                            <Switch
                              checked={currentValue}
                              onCheckedChange={(checked) => {
                                setEditingPermissions(prev => ({
                                  ...prev,
                                  [permission.id]: checked
                                }));
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {permission.permission_key}
                          </div>
                          {isEdited && (
                            <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                              <Edit className="h-3 w-3" />
                              تم التعديل
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default PermissionsTab;
