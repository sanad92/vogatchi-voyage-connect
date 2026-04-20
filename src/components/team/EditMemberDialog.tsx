import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamManagement, TeamMember } from '@/hooks/useTeamManagement';

interface Props {
  member: TeamMember | null;
  onClose: () => void;
}

const EditMemberDialog = ({ member, onClose }: Props) => {
  const { resetPassword, updateEmployeeData } = useTeamManagement();
  const [newPassword, setNewPassword] = useState('');
  const [hr, setHr] = useState({ position: '', department: '', base_salary: 0, hire_date: '' });

  useEffect(() => {
    if (member?.employee) {
      setHr({
        position: member.employee.position || '',
        department: member.employee.department || '',
        base_salary: member.employee.base_salary || 0,
        hire_date: member.employee.hire_date || '',
      });
    }
    setNewPassword('');
  }, [member]);

  if (!member) return null;

  const handleResetPwd = async () => {
    if (newPassword.length < 8) {
      const { toast } = await import('sonner');
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    await resetPassword.mutateAsync({ userId: member.user_id, password: newPassword });
    setNewPassword('');
  };

  const handleUpdateHR = async () => {
    if (!member.linked_employee_id) return;
    await updateEmployeeData.mutateAsync({
      employeeId: member.linked_employee_id,
      updates: hr,
    });
  };

  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل: {member.full_name || member.email}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="password">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="password">كلمة المرور</TabsTrigger>
            <TabsTrigger value="hr" disabled={!member.linked_employee_id}>بيانات HR</TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="space-y-3 pt-4">
            <Label>كلمة مرور جديدة</Label>
            <Input
              type="text"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
            />
            <Button onClick={handleResetPwd} disabled={resetPassword.isPending} className="w-full">
              {resetPassword.isPending ? 'جاري التحديث...' : 'إعادة تعيين كلمة المرور'}
            </Button>
          </TabsContent>

          <TabsContent value="hr" className="space-y-3 pt-4">
            {member.linked_employee_id ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>المنصب</Label>
                    <Input value={hr.position} onChange={(e) => setHr({ ...hr, position: e.target.value })} />
                  </div>
                  <div>
                    <Label>القسم</Label>
                    <Input value={hr.department} onChange={(e) => setHr({ ...hr, department: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>الراتب</Label>
                    <Input type="number" value={hr.base_salary} onChange={(e) => setHr({ ...hr, base_salary: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>تاريخ التوظيف</Label>
                    <Input type="date" value={hr.hire_date} onChange={(e) => setHr({ ...hr, hire_date: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleUpdateHR} disabled={updateEmployeeData.isPending} className="w-full">
                  {updateEmployeeData.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                لا يوجد سجل موظف مرتبط بهذا الحساب.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
