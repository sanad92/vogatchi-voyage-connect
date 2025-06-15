
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Briefcase } from 'lucide-react';
import { useUnifiedUserEmployee } from '@/hooks/useUnifiedUserEmployee';

interface UnifiedEditDialogProps {
  user: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const UnifiedEditDialog = ({ user, isOpen, onOpenChange }: UnifiedEditDialogProps) => {
  const { updateUnifiedData, isUpdating } = useUnifiedUserEmployee();
  
  const [userData, setUserData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    department: user.department || '',
  });

  const [employeeData, setEmployeeData] = useState({
    position: user.employee?.position || '',
    base_salary: user.employee?.base_salary || 0,
    allowances: user.employee?.allowances || 0,
    commission_rate: user.employee?.commission_rate || 0,
    bank_name: user.employee?.bank_name || '',
    bank_account_number: user.employee?.bank_account_number || '',
    national_id: user.employee?.national_id || '',
    emergency_contact_name: user.employee?.emergency_contact_name || '',
    emergency_contact_phone: user.employee?.emergency_contact_phone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUnifiedData({
      userId: user.id,
      userData,
      employeeData: user.employee ? employeeData : undefined,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل بيانات {user.full_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="user" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                بيانات المستخدم
              </TabsTrigger>
              <TabsTrigger value="employee" disabled={!user.employee} className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                بيانات الموظف
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">الاسم الكامل</Label>
                  <Input
                    id="full_name"
                    value={userData.full_name}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="department">القسم</Label>
                  <Input
                    id="department"
                    value={userData.department}
                    onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4">
              {user.employee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">المنصب</Label>
                    <Input
                      id="position"
                      value={employeeData.position}
                      onChange={(e) => setEmployeeData({ ...employeeData, position: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="base_salary">الراتب الأساسي (ج.م)</Label>
                    <Input
                      id="base_salary"
                      type="number"
                      value={employeeData.base_salary}
                      onChange={(e) => setEmployeeData({ ...employeeData, base_salary: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="allowances">البدلات (ج.م)</Label>
                    <Input
                      id="allowances"
                      type="number"
                      value={employeeData.allowances}
                      onChange={(e) => setEmployeeData({ ...employeeData, allowances: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="commission_rate">معدل العمولة (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.01"
                      value={employeeData.commission_rate}
                      onChange={(e) => setEmployeeData({ ...employeeData, commission_rate: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bank_name">اسم البنك</Label>
                    <Input
                      id="bank_name"
                      value={employeeData.bank_name}
                      onChange={(e) => setEmployeeData({ ...employeeData, bank_name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bank_account_number">رقم الحساب البنكي</Label>
                    <Input
                      id="bank_account_number"
                      value={employeeData.bank_account_number}
                      onChange={(e) => setEmployeeData({ ...employeeData, bank_account_number: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="national_id">الرقم القومي</Label>
                    <Input
                      id="national_id"
                      value={employeeData.national_id}
                      onChange={(e) => setEmployeeData({ ...employeeData, national_id: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergency_contact_name">جهة الاتصال في الطوارئ</Label>
                    <Input
                      id="emergency_contact_name"
                      value={employeeData.emergency_contact_name}
                      onChange={(e) => setEmployeeData({ ...employeeData, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="emergency_contact_phone">هاتف جهة الاتصال في الطوارئ</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={employeeData.emergency_contact_phone}
                      onChange={(e) => setEmployeeData({ ...employeeData, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  هذا المستخدم غير مرتبط بموظف
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-6">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedEditDialog;
