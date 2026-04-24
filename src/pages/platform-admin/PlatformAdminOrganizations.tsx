import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Ban, CheckCircle, CalendarPlus, Building2, LogIn } from 'lucide-react';
import { useOrgImpersonation } from '@/hooks/useOrgImpersonation';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  email: string | null;
  member_count: number;
  booking_count: number;
  subscription_plan_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
}

const PlatformAdminOrganizations = () => {
  const qc = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ['platform-admin-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
      return data ?? [];
    },
  });

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['platform-admin-orgs'],
    queryFn: async () => {
      const { data: orgsData } = await supabase.from('organizations').select('*');
      if (!orgsData) return [];

      const { data: members } = await supabase.from('organization_members').select('organization_id');
      const { data: subs } = await supabase.from('subscriptions').select('id, organization_id, plan_id, status, expires_at');
      const { data: bookings } = await supabase.from('hotel_bookings').select('organization_id');

      return orgsData.map((org): OrgRow => {
        const memberCount = members?.filter(m => m.organization_id === org.id).length ?? 0;
        const bookingCount = bookings?.filter(b => b.organization_id === org.id).length ?? 0;
        const activeSub = subs?.find(s => s.organization_id === org.id && (s.status === 'active' || s.status === 'trialing'));
        return {
          ...org,
          member_count: memberCount,
          booking_count: bookingCount,
          subscription_plan_id: activeSub?.plan_id ?? null,
          subscription_id: activeSub?.id ?? null,
          subscription_status: activeSub?.status ?? null,
          subscription_expires_at: activeSub?.expires_at ?? null,
        };
      });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('organizations').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-orgs'] });
      toast.success('تم تحديث حالة المؤسسة');
    },
    onError: () => toast.error('فشل في تحديث الحالة'),
  });

  const changePlan = useMutation({
    mutationFn: async ({ orgId, planId, subId }: { orgId: string; planId: string; subId: string | null }) => {
      if (subId) {
        const { error } = await supabase.from('subscriptions').update({ plan_id: planId }).eq('id', subId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscriptions').insert({
          organization_id: orgId,
          plan_id: planId,
          status: 'active',
          starts_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-orgs'] });
      toast.success('تم تغيير الخطة بنجاح');
    },
    onError: () => toast.error('فشل في تغيير الخطة'),
  });

  const extendTrial = useMutation({
    mutationFn: async ({ orgId, days }: { orgId: string; days: number }) => {
      const { data, error } = await supabase.rpc('extend_trial', {
        _org_id: orgId,
        _extra_days: days,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin-orgs'] });
      toast.success('تم تمديد الفترة التجريبية بنجاح');
    },
    onError: () => toast.error('فشل في تمديد الفترة التجريبية'),
  });

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">إدارة المؤسسات</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            قائمة المؤسسات
          </CardTitle>
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
                    <TableHead className="text-right min-w-[150px]">المؤسسة</TableHead>
                    <TableHead className="text-right min-w-[80px]">الحالة</TableHead>
                    <TableHead className="text-right min-w-[100px]">الاشتراك</TableHead>
                    <TableHead className="text-right min-w-[130px]">الخطة</TableHead>
                    <TableHead className="text-right min-w-[80px]">المستخدمون</TableHead>
                    <TableHead className="text-right min-w-[80px]">الحجوزات</TableHead>
                    <TableHead className="text-right min-w-[110px]">تاريخ التسجيل</TableHead>
                    <TableHead className="text-right min-w-[180px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs?.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.email || org.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.is_active ? 'default' : 'destructive'}>
                          {org.is_active ? 'نشطة' : 'معلّقة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={
                            org.subscription_status === 'trialing' ? 'secondary' :
                            org.subscription_status === 'active' ? 'default' : 'destructive'
                          }>
                            {org.subscription_status === 'trialing' ? 'تجريبي' :
                             org.subscription_status === 'active' ? 'نشط' :
                             org.subscription_status === 'expired' ? 'منتهٍ' :
                             org.subscription_status === 'cancelled' ? 'ملغي' : 'بدون'}
                          </Badge>
                          {org.subscription_expires_at && (
                            <p className="text-xs text-muted-foreground">
                              حتى {new Date(org.subscription_expires_at).toLocaleDateString('ar-EG')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={org.subscription_plan_id ?? ''}
                          onValueChange={(planId) =>
                            changePlan.mutate({ orgId: org.id, planId, subId: org.subscription_id })
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue placeholder={org.plan || 'بدون خطة'} />
                          </SelectTrigger>
                          <SelectContent>
                            {plans?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-foreground text-center">{org.member_count}</TableCell>
                      <TableCell className="text-foreground text-center">{org.booking_count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(org.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant={org.is_active ? 'destructive' : 'default'}
                            className="h-7 text-xs"
                            onClick={() => toggleStatus.mutate({ id: org.id, is_active: !org.is_active })}
                          >
                            {org.is_active ? (
                              <><Ban className="h-3 w-3 ml-1" /> تعليق</>
                            ) : (
                              <><CheckCircle className="h-3 w-3 ml-1" /> تفعيل</>
                            )}
                          </Button>
                          {(org.subscription_status === 'trialing' || org.subscription_status === 'expired') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => extendTrial.mutate({ orgId: org.id, days: 14 })}
                              title="تمديد 14 يوم"
                            >
                              <CalendarPlus className="h-3 w-3 ml-1" /> تمديد
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAdminOrganizations;
