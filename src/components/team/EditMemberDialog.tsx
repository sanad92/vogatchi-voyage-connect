import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link2, Unlink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTeamManagement, TeamMember } from '@/hooks/useTeamManagement';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

interface Props {
  member: TeamMember | null;
  onClose: () => void;
}

const EditMemberDialog = ({ member, onClose }: Props) => {
  const { resetPassword, updateEmployeeData } = useTeamManagement();
  const { employees = [] } = useEmployees();
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState('');
  const [hr, setHr] = useState({ position: '', department: '', base_salary: 0, hire_date: '' });
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // جلب الموظفين غير المرتبطين بأي مستخدم لاستخدامهم في الـ dropdown
  const { data: linkedIds = [] } = useQuery({
    queryKey: ['linked-employee-ids', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('linked_employee_id')
        .not('linked_employee_id', 'is', null);
      return (data || []).map((p: any) => p.linked_employee_id).filter(Boolean) as string[];
    },
    enabled: !!orgId && !!member,
  });

  const availableEmployees = useMemo(() => {
    return (employees || []).filter(
      (e: any) => !linkedIds.includes(e.id) || e.id === member?.linked_employee_id
    );
  }, [employees, linkedIds, member?.linked_employee_id]);

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
    setSelectedEmpId('');
  }, [member]);

  const linkMutation = useMutation({
    mutationFn: async (empId: string) => {
      const { data, error } = await supabase.rpc('link_user_to_employee', {
        p_user_id: member!.user_id,
        p_employee_id: empId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم ربط الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['linked-employee-ids', orgId] });
      setSelectedEmpId('');
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الربط'),
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('unlink_user_from_employee', {
        p_user_id: member!.user_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم إلغاء الربط');
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['linked-employee-ids', orgId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل إلغاء الربط'),
  });

  if (!member) return null;

  const handleResetPwd = async () => {
    if (newPassword.length < 8) {
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
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="password">كلمة المرور</TabsTrigger>
            <TabsTrigger value="hr" disabled={!member.linked_employee_id}>بيانات HR</TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="w-3 h-3 ml-1" /> ربط الموظف
            </TabsTrigger>
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

          <TabsContent value="link" className="space-y-4 pt-4">
            {member.linked_employee_id && member.employee ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-success/5 border-success/20">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">مرتبط بسجل موظف</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{member.employee.employee_code}</Badge>
                      {member.employee.position && (
                        <span className="text-xs text-muted-foreground">{member.employee.position}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">تغيير الربط لموظف آخر</Label>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر موظف آخر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees
                        .filter((e: any) => e.id !== member.linked_employee_id)
                        .map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name} — {e.employee_code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedEmpId && linkMutation.mutate(selectedEmpId)}
                    disabled={!selectedEmpId || linkMutation.isPending}
                    className="w-full"
                    size="sm"
                  >
                    {linkMutation.isPending ? 'جاري الربط...' : 'تغيير الربط'}
                  </Button>
                </div>

                <Button
                  onClick={() => unlinkMutation.mutate()}
                  disabled={unlinkMutation.isPending}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Unlink className="w-3 h-3 ml-1" />
                  {unlinkMutation.isPending ? 'جاري...' : 'إلغاء الربط'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-warning/5 border-warning/20">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">لا يوجد موظف مرتبط</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      هذا المستخدم لن يظهر كموظف حجز. اربطه بسجل موظف موجود.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>اختر موظف للربط</Label>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر من الموظفين المتاحين..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          لا يوجد موظفون متاحون للربط
                        </div>
                      ) : (
                        availableEmployees.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name} — {e.employee_code}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedEmpId && linkMutation.mutate(selectedEmpId)}
                    disabled={!selectedEmpId || linkMutation.isPending}
                    className="w-full"
                  >
                    <Link2 className="w-4 h-4 ml-1" />
                    {linkMutation.isPending ? 'جاري الربط...' : 'ربط بالموظف'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
