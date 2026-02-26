import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PlatformAdminLayout from '@/components/platform-admin/PlatformAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Ban, CheckCircle } from 'lucide-react';

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
      // Fetch orgs
      const { data: orgsData } = await supabase.from('organizations').select('*');
      if (!orgsData) return [];

      // Fetch member counts
      const { data: members } = await supabase.from('organization_members').select('organization_id');
      
      // Fetch subscriptions
      const { data: subs } = await supabase.from('subscriptions').select('id, organization_id, plan_id, status');

      // Fetch booking counts (hotel as proxy)
      const { data: bookings } = await supabase.from('hotel_bookings').select('organization_id');

      return orgsData.map((org): OrgRow => {
        const memberCount = members?.filter(m => m.organization_id === org.id).length ?? 0;
        const bookingCount = bookings?.filter(b => b.organization_id === org.id).length ?? 0;
        const activeSub = subs?.find(s => s.organization_id === org.id && s.status === 'active');
        return {
          ...org,
          member_count: memberCount,
          booking_count: bookingCount,
          subscription_plan_id: activeSub?.plan_id ?? null,
          subscription_id: activeSub?.id ?? null,
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

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">إدارة المؤسسات</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">قائمة المؤسسات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المؤسسة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الخطة</TableHead>
                      <TableHead className="text-right">المستخدمون</TableHead>
                      <TableHead className="text-right">الحجوزات</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
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
                          <Select
                            value={org.subscription_plan_id ?? ''}
                            onValueChange={(planId) =>
                              changePlan.mutate({ orgId: org.id, planId, subId: org.subscription_id })
                            }
                          >
                            <SelectTrigger className="w-32">
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
                        <TableCell className="text-foreground">{org.member_count}</TableCell>
                        <TableCell className="text-foreground">{org.booking_count}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(org.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={org.is_active ? 'destructive' : 'default'}
                            onClick={() => toggleStatus.mutate({ id: org.id, is_active: !org.is_active })}
                          >
                            {org.is_active ? (
                              <><Ban className="h-3 w-3 ml-1" /> تعليق</>
                            ) : (
                              <><CheckCircle className="h-3 w-3 ml-1" /> تفعيل</>
                            )}
                          </Button>
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
    </PlatformAdminLayout>
  );
};

export default PlatformAdminOrganizations;
