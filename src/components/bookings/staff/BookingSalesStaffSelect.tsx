import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export function BookingSalesStaffSelect({ value, onChange, enabled = true, disabled = false, selectedName }: {
  value: string;
  onChange: (value: string) => void;
  enabled?: boolean;
  disabled?: boolean;
  selectedName?: string;
}) {
  const id = useId();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const staff = useQuery({
    queryKey: ['booking-sales-staff', orgId, user?.id],
    enabled: !!orgId && !!user?.id && enabled,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<{ id: string; full_name: string }[]>('list_booking_sales_staff', { _org: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });
  return <div className="space-y-1">
    <Label htmlFor={id}>موظف المبيعات</Label>
    <select id={id} className="h-10 w-full rounded-md border bg-background px-2 text-sm"
      value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      <option value="">بيع باسم الشركة</option>
      {value && !staff.data?.some(employee => employee.id === value) &&
        <option value={value}>{selectedName ?? 'الموظف المحدد'}</option>}
      {staff.data?.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
    </select>
    {staff.isError && <Button type="button" variant="ghost" onClick={() => staff.refetch()}>تعذر تحميل الموظفين. إعادة المحاولة</Button>}
    <p className="text-xs text-muted-foreground">موظف العمليات بيتسجل تلقائيًا من حسابك.</p>
  </div>;
}
