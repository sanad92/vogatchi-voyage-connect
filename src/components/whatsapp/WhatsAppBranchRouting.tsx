import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranchesDepartments';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { supabase } from '@/integrations/supabase/client';

const NONE = 'none';

type RoutingChange =
  | { type: 'create-region'; name: string }
  | { type: 'region-manager'; id: string; value: string | null }
  | { type: 'branch-region'; id: string; value: string | null }
  | { type: 'member-branch'; id: string; value: string | null };

export function WhatsAppBranchRouting() {
  const orgId = useOrgId();
  const { members, currentUserRole, isLoading: membersLoading, error: membersError } = useOrgMembers();
  const { data: branches, isLoading: branchesLoading, error: branchesError } = useBranches();
  const queryClient = useQueryClient();
  const [regionName, setRegionName] = useState('');
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const { data: regions, isLoading: regionsLoading, error: regionsError } = useQuery({
    queryKey: ['whatsapp-regions', orgId],
    enabled: !!orgId && canManage,
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_regions').select('id, name, manager_user_id')
        .eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data;
    },
  });

  const change = useMutation({
    mutationFn: async (input: RoutingChange) => {
      if (!orgId || !canManage) throw new Error('لا تملك صلاحية إدارة توزيع الفروع');
      const result = await (() => {
        switch (input.type) {
          case 'create-region':
            return supabase.from('whatsapp_regions').insert({ organization_id: orgId, name: input.name }).select('id').single();
          case 'region-manager':
            return supabase.from('whatsapp_regions').update({ manager_user_id: input.value })
              .eq('organization_id', orgId).eq('id', input.id).select('id').single();
          case 'branch-region':
            return supabase.from('branches').update({ whatsapp_region_id: input.value })
              .eq('organization_id', orgId).eq('id', input.id).select('id').single();
          case 'member-branch':
            return supabase.from('organization_members').update({ branch_id: input.value })
              .eq('organization_id', orgId).eq('id', input.id).select('id').single();
        }
      })();
      if (result.error) throw result.error;
    },
    onSuccess: (_data, input) => {
      if (input.type === 'create-region') setRegionName('');
      for (const key of ['whatsapp-regions', 'branches', 'org-members', 'wa-inbox-channels', 'whatsapp-conversations']) {
        void queryClient.invalidateQueries({ queryKey: [key, orgId] });
      }
      toast.success('تم حفظ توزيع الفروع');
    },
    onError: error => toast.error(error.message || 'تعذر حفظ توزيع الفروع'),
  });

  if (!canManage) return null;
  const activeBranches = (branches ?? []).filter(branch => branch.is_active);
  const staff = members.filter(member => member.role !== 'owner' && member.role !== 'admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>مناطق وفروع واتساب</CardTitle>
        <CardDescription>حدد فرع كل موظف، واجمع الفروع تحت مدير منطقة. اربط أرقام واتساب بالفروع من تبويب القنوات والخدمة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(membersError || branchesError || regionsError) && <p role="alert" className="text-sm text-destructive">تعذر تحميل إعدادات توزيع الفروع.</p>}
        {(membersLoading || branchesLoading || regionsLoading) && <p role="status" className="text-sm text-muted-foreground">جاري تحميل توزيع الفروع…</p>}
        <form className="flex gap-2" onSubmit={event => {
          event.preventDefault();
          if (regionName.trim()) change.mutate({ type: 'create-region', name: regionName.trim() });
        }}>
          <Input aria-label="اسم المنطقة" placeholder="اسم المنطقة" value={regionName} maxLength={120} onChange={event => setRegionName(event.target.value)} />
          <Button type="submit" disabled={!regionName.trim() || change.isPending}>إضافة منطقة</Button>
        </form>
        {!!regions?.length && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">مديرو المناطق</h3>
            {regions.map(region => (
              <div key={region.id} className="grid items-center gap-2 sm:grid-cols-2">
                <span className="text-sm">{region.name}</span>
                <Select value={region.manager_user_id ?? NONE} disabled={change.isPending || membersLoading || !!membersError}
                  onValueChange={value => change.mutate({ type: 'region-manager', id: region.id, value: value === NONE ? null : value })}>
                  <SelectTrigger aria-label={`مدير منطقة ${region.name}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون مدير منطقة</SelectItem>
                    {staff.map(member => <SelectItem key={member.id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</SelectItem>)}
                    {region.manager_user_id && !staff.some(member => member.user_id === region.manager_user_id) &&
                      <SelectItem value={region.manager_user_id}>المدير الحالي</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </section>
        )}
        {!!activeBranches.length && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">منطقة كل فرع</h3>
            {activeBranches.map(branch => (
              <div key={branch.id} className="grid items-center gap-2 sm:grid-cols-2">
                <span className="text-sm">{branch.name}</span>
                <Select value={branch.whatsapp_region_id ?? NONE} disabled={change.isPending || regionsLoading || !!regionsError}
                  onValueChange={value => change.mutate({ type: 'branch-region', id: branch.id, value: value === NONE ? null : value })}>
                  <SelectTrigger aria-label={`منطقة فرع ${branch.name}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون منطقة</SelectItem>
                    {regions?.map(region => <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </section>
        )}
        {!!staff.length && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">فرع كل موظف</h3>
            {staff.map(member => (
              <div key={member.id} className="grid items-center gap-2 sm:grid-cols-2">
                <span className="text-sm">{member.profile?.full_name || member.profile?.email || member.user_id}</span>
                <Select value={member.branch_id ?? NONE} disabled={change.isPending || branchesLoading || !!branchesError}
                  onValueChange={value => change.mutate({ type: 'member-branch', id: member.id, value: value === NONE ? null : value })}>
                  <SelectTrigger aria-label={`فرع ${member.profile?.full_name || member.profile?.email || member.user_id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون فرع</SelectItem>
                    {activeBranches.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                    {member.branch_id && !activeBranches.some(branch => branch.id === member.branch_id) &&
                      <SelectItem value={member.branch_id}>الفرع الحالي غير نشط</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
