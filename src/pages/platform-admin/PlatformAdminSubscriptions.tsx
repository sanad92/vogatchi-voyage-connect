import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, XCircle, Clock, CalendarPlus, Filter } from 'lucide-react';
import { useState } from 'react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  trialing: { label: 'تجريبي', variant: 'secondary' },
  expired: { label: 'منتهٍ', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'outline' },
};

const PlatformAdminSubscriptions = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: plans } = useQuery({
    queryKey: ['platform-subs-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
      return data ?? [];
    },
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['platform-admin-subscriptions'],
    queryFn: async () => {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, organizations(name, slug, email), subscription_plans(name, name_ar)')
        .order('created_at', { ascending: false });
      return subs ?? [];
    },
  });

  const changePlan = useMutation({
    mutationFn: async ({ subId, planId }: { subId: string; planId: string }) => {
      const { error } = await supabase.from('subscriptions').update({ plan_id: planId }).eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-subscriptions'] });
      toast.success('تم تغيير الخطة بنجاح');
    },
    onError: () => toast.error('فشل في تغيير الخطة'),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ subId, status }: { subId: string; status: string }) => {
      const { error } = await supabase.from('subscriptions').update({ status }).eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-subscriptions'] });
      toast.success('تم تحديث حالة الاشتراك');
    },
    onError: () => toast.error('فشل في تحديث الحالة'),
  });

  const extendSub = useMutation({
    mutationFn: async ({ subId, days }: { subId: string; days: number }) => {
      const sub = subscriptions?.find(s => s.id === subId);
      const base = sub?.expires_at ? new Date(sub.expires_at) : new Date();
      const newExpiry = new Date(base.getTime() + days * 86400000);
      const { error } = await supabase.from('subscriptions').update({
        expires_at: newExpiry.toISOString(),
        status: 'active',
      }).eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-subscriptions'] });
      toast.success('تم تمديد الاشتراك بنجاح');
    },
    onError: () => toast.error('فشل في تمديد الاشتراك'),
  });

  const filtered = subscriptions?.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  );

  const stats = {
    total: subscriptions?.length ?? 0,
    active: subscriptions?.filter(s => s.status === 'active').length ?? 0,
    trialing: subscriptions?.filter(s => s.status === 'trialing').length ?? 0,
    expired: subscriptions?.filter(s => s.status === 'expired').length ?? 0,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">إدارة الاشتراكات</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الاشتراكات', value: stats.total, icon: CreditCard, color: 'text-primary' },
          { label: 'نشطة', value: stats.active, icon: CheckCircle, color: 'text-success' },
          { label: 'تجريبية', value: stats.trialing, icon: Clock, color: 'text-warning' },
          { label: 'منتهية', value: stats.expired, icon: XCircle, color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn("h-8 w-8", s.color)} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            جميع الاشتراكات
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="trialing">تجريبي</SelectItem>
                <SelectItem value="expired">منتهٍ</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right min-w-[160px]">المؤسسة</TableHead>
                    <TableHead className="text-right min-w-[100px]">الحالة</TableHead>
                    <TableHead className="text-right min-w-[140px]">الخطة</TableHead>
                    <TableHead className="text-right min-w-[120px]">تاريخ البدء</TableHead>
                    <TableHead className="text-right min-w-[120px]">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-right min-w-[200px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((sub) => {
                    const org = sub.organizations as any;
                    const plan = sub.subscription_plans as any;
                    const st = statusLabels[sub.status] || { label: sub.status, variant: 'outline' as const };
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{org?.name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{org?.email || org?.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.plan_id || ''}
                            onValueChange={(planId) => changePlan.mutate({ subId: sub.id, planId })}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder={plan?.name_ar || 'بدون'} />
                            </SelectTrigger>
                            <SelectContent>
                              {plans?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.starts_at ? new Date(sub.starts_at).toLocaleDateString('ar-EG') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('ar-EG') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sub.status !== 'active' && (
                              <Button size="sm" variant="default" className="h-7 text-xs"
                                onClick={() => changeStatus.mutate({ subId: sub.id, status: 'active' })}>
                                <CheckCircle className="h-3 w-3 ml-1" /> تفعيل
                              </Button>
                            )}
                            {sub.status === 'active' && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs"
                                onClick={() => changeStatus.mutate({ subId: sub.id, status: 'cancelled' })}>
                                <XCircle className="h-3 w-3 ml-1" /> إلغاء
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => extendSub.mutate({ subId: sub.id, days: 30 })}>
                              <CalendarPlus className="h-3 w-3 ml-1" /> +30 يوم
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filtered?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد اشتراكات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAdminSubscriptions;

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
