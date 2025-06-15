
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Template, Users, Shield, Eye, Edit } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

// قوالب الصلاحيات المحددة مسبقاً
const PERMISSION_TEMPLATES = [
  {
    id: 'admin',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة عدا إعدادات النظام',
    permissions: {
      customers_read: true,
      customers_write: true,
      bookings_read: true,
      bookings_write: true,
      suppliers_read: true,
      suppliers_write: true,
      invoices_read: true,
      invoices_write: true,
      reports_read: true,
      reports_write: true,
      employees_read: true,
      employees_write: true,
      expenses_read: true,
      expenses_write: true,
      users_read: true,
      users_write: true,
      settings_read: false,
      settings_write: false,
    }
  },
  {
    id: 'manager',
    name: 'مدير',
    description: 'صلاحيات واسعة للإدارة والمتابعة',
    permissions: {
      customers_read: true,
      customers_write: true,
      bookings_read: true,
      bookings_write: true,
      suppliers_read: true,
      suppliers_write: true,
      invoices_read: true,
      invoices_write: true,
      reports_read: true,
      reports_write: false,
      employees_read: true,
      employees_write: false,
      expenses_read: true,
      expenses_write: true,
      users_read: true,
      users_write: false,
      settings_read: false,
      settings_write: false,
    }
  },
  {
    id: 'sales_agent',
    name: 'مندوب مبيعات',
    description: 'التركيز على العملاء والحجوزات',
    permissions: {
      customers_read: true,
      customers_write: true,
      bookings_read: true,
      bookings_write: true,
      suppliers_read: true,
      suppliers_write: false,
      invoices_read: true,
      invoices_write: false,
      reports_read: true,
      reports_write: false,
      employees_read: false,
      employees_write: false,
      expenses_read: false,
      expenses_write: false,
      users_read: false,
      users_write: false,
      settings_read: false,
      settings_write: false,
    }
  },
  {
    id: 'accountant',
    name: 'محاسب',
    description: 'التركيز على الفواتير والمصروفات',
    permissions: {
      customers_read: true,
      customers_write: false,
      bookings_read: true,
      bookings_write: false,
      suppliers_read: true,
      suppliers_write: false,
      invoices_read: true,
      invoices_write: true,
      reports_read: true,
      reports_write: true,
      employees_read: true,
      employees_write: false,
      expenses_read: true,
      expenses_write: true,
      users_read: false,
      users_write: false,
      settings_read: false,
      settings_write: false,
    }
  },
  {
    id: 'viewer',
    name: 'مشاهد',
    description: 'صلاحيات قراءة فقط',
    permissions: {
      customers_read: true,
      customers_write: false,
      bookings_read: true,
      bookings_write: false,
      suppliers_read: true,
      suppliers_write: false,
      invoices_read: true,
      invoices_write: false,
      reports_read: true,
      reports_write: false,
      employees_read: false,
      employees_write: false,
      expenses_read: false,
      expenses_write: false,
      users_read: false,
      users_write: false,
      settings_read: false,
      settings_write: false,
    }
  }
];

interface PermissionTemplatesProps {
  onApplyTemplate?: (userId: string, permissions: any) => void;
}

const PermissionTemplates = ({ onApplyTemplate }: PermissionTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { updatePermissions } = useUserPermissions();

  const getPermissionCount = (permissions: any) => {
    const readPermissions = Object.keys(permissions).filter(key => 
      key.endsWith('_read') && permissions[key]
    ).length;
    
    const writePermissions = Object.keys(permissions).filter(key => 
      key.endsWith('_write') && permissions[key]
    ).length;

    return { read: readPermissions, write: writePermissions };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Template className="h-5 w-5" />
            قوالب الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            اختر قالباً جاهزاً لتطبيق مجموعة صلاحيات محددة مسبقاً على المستخدمين
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERMISSION_TEMPLATES.map((template) => {
              const permCount = getPermissionCount(template.permissions);
              
              return (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {permCount.read} قراءة
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Edit className="h-3 w-3" />
                          {permCount.write} كتابة
                        </Badge>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            عرض التفاصيل
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{template.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-gray-600">{template.description}</p>
                            
                            <div className="space-y-2">
                              <h5 className="font-medium">الصلاحيات المتضمنة:</h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(template.permissions)
                                  .filter(([_, value]) => value)
                                  .map(([key, _]) => (
                                    <div key={key} className="flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                      <span>{key.replace('_', ' ').replace('read', 'قراءة').replace('write', 'كتابة')}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedTemplate && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    تم اختيار: {PERMISSION_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    يمكنك الآن تطبيق هذا القالب على أي مستخدم من مصفوفة الصلاحيات
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  إلغاء الاختيار
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionTemplates;
