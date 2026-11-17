import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useToast } from '@/hooks/use-toast';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type Policy = { sales_enabled: boolean; operations_enabled: boolean };
const emptyPolicy = { sales_enabled: false, operations_enabled: false };

export default function BookingWorkflowCommissionPolicy() {
  const orgId = useOrgId();
  const { orgRole } = useOrganization();
  const { hasPermission } = useSupabasePermissions();
  const canManage = ['owner', 'admin', 'manager'].includes(orgRole ?? '') && hasPermission('employees_commission');
  return canManage && orgId ? <PolicyForm key={orgId} orgId={orgId} /> : null;
}

function PolicyForm({ orgId }: { orgId: string }) {
  const [draft, setDraft] = useState<Policy>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ['booking-commission-policy', orgId];
  const rules = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Policy>('booking_commission_policy', {
        _org: orgId, _sales: null, _operations: null,
      });
      if (error) throw error;
      return data ?? emptyPolicy;
    },
  });
  const save = useMutation({
    mutationFn: async (policy: Policy) => {
      const { data, error } = await callUntypedRpc<Policy>('booking_commission_policy', {
        _org: orgId, _sales: policy.sales_enabled, _operations: policy.operations_enabled,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: policy => {
      qc.setQueryData(key, policy);
      setDraft(undefined);
      toast({ title: 'تم حفظ سياسة عمولات الحجوزات' });
    },
    onError: () => toast({ title: 'تعذر حفظ سياسة العمولة', variant: 'destructive' }),
  });
  const current = draft ?? rules.data;
  return <Card>
    <CardHeader><CardTitle className="text-base">سياسة عمولات الحجوزات</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {rules.isError && <Button variant="outline" onClick={() => rules.refetch()}>تعذر تحميل السياسة. إعادة المحاولة</Button>}
      {!current && rules.isPending && <p className="text-sm text-muted-foreground">جارٍ تحميل السياسة…</p>}
      {current && <form className="space-y-3" onSubmit={event => { event.preventDefault(); save.mutate(current); }}>
        <p className="text-sm text-muted-foreground">اضبط نسبة كل موظف من إعدادات الموظفين. تتحسب النسبة من ربح الحجز بعد اعتماد التكلفة.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.sales_enabled}
          onChange={event => setDraft({ ...current, sales_enabled: event.target.checked })} />عمولة موظف المبيعات</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.operations_enabled}
          onChange={event => setDraft({ ...current, operations_enabled: event.target.checked })} />عمولة موظف العمليات</label>
        <Button size="sm" disabled={!draft || save.isPending}>حفظ السياسة</Button>
      </form>}
    </CardContent>
  </Card>;
}
