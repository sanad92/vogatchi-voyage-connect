
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Shield, Plus, Edit } from "lucide-react";

interface Permission {
  id: string;
  role_name: string;
  permission_key: string;
  permission_value: boolean;
}

const PermissionsTab = () => {
  const queryClient = useQueryClient();
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
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

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل الصلاحيات...</div>;
  }

  // تجميع الصلاحيات حسب الدور
  const permissionsByRole = permissions?.reduce((acc, permission) => {
    if (!acc[permission.role_name]) {
      acc[permission.role_name] = [];
    }
    acc[permission.role_name].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  return (
    <div className="space-y-6">
      {/* إضافة صلاحية جديدة */}
      <div className="flex justify-end">
        <Dialog open={isAddPermissionOpen} onOpenChange={setIsAddPermissionOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة صلاحية
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة صلاحية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role_name">الدور</Label>
                <Input
                  id="role_name"
                  value={newPermission.role_name}
                  onChange={(e) => setNewPermission({ ...newPermission, role_name: e.target.value })}
                  placeholder="مثل: manager"
                />
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
                disabled={addPermissionMutation.isPending}
                className="w-full"
              >
                إضافة الصلاحية
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* عرض الصلاحيات مجمعة حسب الدور */}
      <div className="space-y-6">
        {Object.entries(permissionsByRole).map(([roleName, rolePermissions]) => (
          <Card key={roleName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {getRoleLabel(roleName)}
                <span className="text-sm text-gray-500">({rolePermissions.length} صلاحية)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rolePermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {getPermissionLabel(permission.permission_key)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {permission.permission_key}
                      </div>
                    </div>
                    <Switch
                      checked={permission.permission_value}
                      onCheckedChange={(checked) =>
                        updatePermissionMutation.mutate({
                          id: permission.id,
                          value: checked
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PermissionsTab;
