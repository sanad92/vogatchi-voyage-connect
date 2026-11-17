import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type Commission = {
  id: string;
  booking_id: string;
  booking_number: string;
  employee_name: string | null;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'cancelled';
};

const statusLabels = { pending: 'مستحقة', paid: 'مدفوعة', cancelled: 'ملغاة' };

export default function BookingWorkflowCommissionRows() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const rows = useQuery({
    queryKey: ['employee-commissions', orgId, user?.id, 'booking-workflow'],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Commission[]>('list_booking_workflow_commissions', { _org: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (rows.isPending) return <p className="text-sm text-muted-foreground">جارٍ تحميل عمولات الحجوزات…</p>;
  if (rows.isError) return <Button variant="outline" onClick={() => rows.refetch()}>تعذر تحميل العمولات. إعادة المحاولة</Button>;
  if (!rows.data.length) return <p className="text-sm text-muted-foreground">هنا تظهر العمولات بعد اعتماد تكلفة الحجز.</p>;
  return <Table>
    <TableHeader><TableRow>
      <TableHead>الحجز</TableHead><TableHead>الموظف</TableHead><TableHead>النسبة</TableHead>
      <TableHead>العمولة</TableHead><TableHead>الحالة</TableHead>
    </TableRow></TableHeader>
    <TableBody>{rows.data.map(row => <TableRow key={row.id}>
      <TableCell><Link className="text-primary underline-offset-4 hover:underline"
        to={`/bookings/${row.booking_id}?tab=amendments`}>{row.booking_number}</Link></TableCell>
      <TableCell>{row.employee_name ?? '—'}</TableCell>
      <TableCell>{row.commission_rate}%</TableCell>
      <TableCell>{Number(row.commission_amount).toLocaleString()} {row.currency}</TableCell>
      <TableCell><Badge variant={row.payment_status === 'paid' ? 'default' : 'secondary'}>{statusLabels[row.payment_status] ?? row.payment_status}</Badge></TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
