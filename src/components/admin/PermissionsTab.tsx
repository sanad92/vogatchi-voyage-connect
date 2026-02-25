
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

// Permissions are managed via organization_members.role
// Role hierarchy: owner > admin > manager > agent > viewer

const PermissionsTab = () => {
  const rolePermissions = [
    { role: 'owner', label: 'مالك', permissions: ['جميع الصلاحيات', 'إدارة الأعضاء', 'إعدادات النظام', 'حذف المؤسسة'] },
    { role: 'admin', label: 'أدمن', permissions: ['إدارة المستخدمين', 'إدارة الحجوزات', 'إدارة العملاء', 'إدارة الفواتير', 'عرض التقارير', 'إدارة النظام'] },
    { role: 'manager', label: 'مدير', permissions: ['إدارة الحجوزات', 'إدارة العملاء', 'إدارة الفواتير', 'عرض التقارير', 'إدارة المصروفات'] },
    { role: 'agent', label: 'وكيل', permissions: ['إنشاء حجوزات', 'إدارة العملاء', 'إنشاء فواتير', 'عرض التقارير'] },
    { role: 'viewer', label: 'مشاهد', permissions: ['عرض البيانات فقط'] },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rolePermissions.map((role) => (
          <Card key={role.role} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{role.label}</h3>
              </div>
              <ul className="space-y-1">
                {role.permissions.map((perm, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        يتم إدارة الأدوار عبر عضوية المؤسسة (organization_members)
      </p>
    </div>
  );
};

export default PermissionsTab;
