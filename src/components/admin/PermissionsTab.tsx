
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

// جدول الصلاحيات المخصصة غير موجود في قاعدة البيانات حالياً
// الصلاحيات تُدار عبر جدول user_roles

const PermissionsTab = () => {
  const rolePermissions = [
    { role: 'super_admin', label: 'سوبر أدمن', permissions: ['جميع الصلاحيات'] },
    { role: 'admin', label: 'أدمن', permissions: ['إدارة المستخدمين', 'إدارة الحجوزات', 'إدارة العملاء', 'إدارة الفواتير', 'عرض التقارير'] },
    { role: 'manager', label: 'مدير', permissions: ['إدارة الحجوزات', 'إدارة العملاء', 'إدارة الفواتير', 'عرض التقارير'] },
    { role: 'sales_agent', label: 'مندوب مبيعات', permissions: ['إنشاء حجوزات', 'عرض العملاء', 'إنشاء فواتير'] },
    { role: 'accountant', label: 'محاسب', permissions: ['إدارة الفواتير', 'إدارة المدفوعات', 'عرض التقارير المالية'] },
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
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-gray-500 text-center">
        يتم إدارة الأدوار والصلاحيات من خلال نظام المستخدمين
      </p>
    </div>
  );
};

export default PermissionsTab;
