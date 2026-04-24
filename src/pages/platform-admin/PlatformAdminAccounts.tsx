import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Shield, Trash2, UserCog, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

interface PlatformAdminRow {
  id: string;
  user_id: string;
  role: 'platform_owner' | 'platform_admin';
  created_at: string;
  email: string | null;
  full_name: string | null;
}

const PlatformAdminAccounts = () => {
  const qc = useQueryClient();
  const { isPlatformOwner } = usePlatformAdmin();
  const [openAdd, setOpenAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlatformAdminRow | null>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'platform_admin' as 'platform_admin' | 'platform_owner' });

  const { data: admins = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async (): Promise<PlatformAdminRow[]> => {
      const { data: roles, error } = await supabase
        .from('platform_roles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const ids = (roles ?? []).map(r => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', ids);

      const profMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return (roles ?? []).map(r => ({
        ...r,
        email: profMap.get(r.user_id)?.email ?? null,
        full_name: profMap.get(r.user_id)?.full_name ?? null,
      })) as PlatformAdminRow[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ row, newRole }: { row: PlatformAdminRow; newRole: 'platform_owner' | 'platform_admin' }) => {
      if (row.role === newRole) return;
      // Prevent demoting the last owner
      if (row.role === 'platform_owner' && newRole !== 'platform_owner') {
        const ownerCount = admins.filter(a => a.role === 'platform_owner').length;
        if (ownerCount <= 1) throw new Error('لا يمكن تخفيض آخر مالك للمنصة');
      }
      const { error } = await supabase
        .from('platform_roles')
        .update({ role: newRole })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث الدور');
      qc.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'فشل تحديث الدور'),
  });

  const createAdmin = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-create-admin', {
        body: form,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success('تم إنشاء حساب مدير المنصة بنجاح');
      setOpenAdd(false);
      setForm({ email: '', password: '', full_name: '', role: 'platform_admin' });
      qc.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'فشل إنشاء الحساب'),
  });

  const deleteAdmin = useMutation({
    mutationFn: async (row: PlatformAdminRow) => {
      // Check it's not the last platform_owner
      if (row.role === 'platform_owner') {
        const ownerCount = admins.filter(a => a.role === 'platform_owner').length;
        if (ownerCount <= 1) throw new Error('لا يمكن إزالة آخر مالك للمنصة');
      }
      const { error } = await supabase
        .from('platform_roles')
        .delete()
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إزالة الصلاحية بنجاح');
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'فشل الإزالة'),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-amber-600" /> حسابات المنصة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المستخدمين الذين يملكون صلاحية إدارة المنصة بالكامل
          </p>
        </div>
        {isPlatformOwner && (
          <Button onClick={() => setOpenAdd(true)} className="bg-gradient-to-r from-amber-500 to-orange-600">
            <Plus className="h-4 w-4 mr-2" /> إضافة مدير منصة
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المدراء الحاليون ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد مدراء منصة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>أُضيف في</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.email ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.role === 'platform_owner' ? 'default' : 'secondary'} className={a.role === 'platform_owner' ? 'bg-amber-600' : ''}>
                        <Shield className="h-3 w-3 mr-1" />
                        {a.role === 'platform_owner' ? 'مالك المنصة' : 'مدير منصة'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(a.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell className="text-end">
                      {isPlatformOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingDelete(a)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مدير منصة جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="اسم المدير" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="8 أحرف على الأقل" />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">مدير منصة</SelectItem>
                  <SelectItem value="platform_owner">مالك منصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>هذا الحساب سيُنشأ كمستخدم منصة فقط بدون أي عضوية في مؤسسة. يستطيع إدارة كافة المؤسسات والاشتراكات.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>إلغاء</Button>
            <Button
              onClick={() => createAdmin.mutate()}
              disabled={!form.email || !form.password || !form.full_name || createAdmin.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600"
            >
              {createAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              إنشاء الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة صلاحية المنصة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إزالة صلاحية إدارة المنصة من <b>{pendingDelete?.full_name ?? pendingDelete?.email}</b>. الحساب نفسه لن يُحذف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteAdmin.mutate(pendingDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              تأكيد الإزالة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlatformAdminAccounts;
