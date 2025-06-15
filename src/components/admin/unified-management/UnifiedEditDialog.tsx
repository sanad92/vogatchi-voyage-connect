
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Briefcase } from 'lucide-react';
import { useUnifiedUserEmployee } from '@/hooks/useUnifiedUserEmployee';
import UserDataTab from './edit-dialog/UserDataTab';
import EmployeeDataTab from './edit-dialog/EmployeeDataTab';

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
              <UserDataTab
                userData={userData}
                onUserDataChange={setUserData}
              />
            </TabsContent>

            <TabsContent value="employee" className="space-y-4">
              <EmployeeDataTab
                employeeData={employeeData}
                onEmployeeDataChange={setEmployeeData}
                hasEmployee={!!user.employee}
              />
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
