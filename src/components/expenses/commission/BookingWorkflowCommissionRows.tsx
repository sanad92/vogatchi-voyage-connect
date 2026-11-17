import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
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
  entitlement: number;
  signed_balance: number;
  can_settle: boolean;
  cost_needs_review: boolean;
};

const showAmount = (amount: number, currency: string) =>
  `${Math.abs(amount).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;

function SettlementDialog({ commission, orgId, onClose }: { commission: Commission; orgId: string; onClose: () => void }) {
  const recovery = commission.signed_balance < 0;
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [treasury, setTreasury] = useState('');
  const [reference, setReference] = useState('');
  const [rate, setRate] = useState(commission.currency === 'EGP' ? '1' : '');
  const qc = useQueryClient();
  const accounts = useQuery({
    queryKey: ['commission-settlement-treasuries', orgId, commission.currency],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('id,account_name,treasury_kind')
        .eq('organization_id', orgId).eq('is_active', true).eq('currency', commission.currency).order('account_name');
      if (error) throw error;
      return data ?? [];
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<string>('settle_booking_commission', {
        _commission: commission.id, _request: request, _treasury: treasury,
        _expected: commission.signed_balance, _rate: Number(rate), _reference: reference.trim(),
      });
      if (error) throw error;
      if (data !== request) throw new Error('commission_settlement_unconfirmed');
    },
    onSuccess: async () => {
      await Promise.all(['employee-commissions', 'bank-accounts', 'bank-accounts-enhanced',
        'bank-account-transactions', 'workspace-timeline', 'booking-staff'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      toast.success(recovery ? 'تم تسجيل تحصيل فرق العمولة' : 'تم تسجيل صرف العمولة');
      onClose();
    },
    onError: (error: { message: string }) => {
      if (error.message === 'commission_settlement_amount_changed') {
        void qc.invalidateQueries({ queryKey: ['employee-commissions'] });
        toast.error('المبلغ اتغير. افتح العملية من جديد وراجع الرصيد.');
      } else if (error.message === 'commission_settlement_invalid_treasury') {
        toast.error('راجع عملة حساب الصرف والرصيد المتاح في الخزينة.');
      } else {
        toast.error('تعذر تأكيد التسوية. راجع المرجع والحساب أو أعد المحاولة بنفس البيانات.');
      }
    },
  });
  const valid = treasury && reference.trim().length >= 3 && Number(rate) > 0 && Number(rate) < 1_000_000;
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}>
    <DialogContent dir="rtl">
      <DialogHeader>
        <DialogTitle>{recovery ? 'تسجيل تحصيل فرق العمولة' : 'تسجيل صرف عمولة الحجز'}</DialogTitle>
        <DialogDescription>{commission.employee_name} · {commission.booking_number} · {showAmount(commission.signed_balance, commission.currency)}</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (valid && !save.isPending) save.mutate(); }}>
        <div className="space-y-1">
          <Label htmlFor="commission-treasury">حساب الخزينة أو البنك</Label>
          <select id="commission-treasury" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            value={treasury} disabled={save.isPending || !accounts.isSuccess}
            onChange={event => { setTreasury(event.target.value); setRequest(crypto.randomUUID()); }}>
            <option value="">اختار الحساب</option>
            {accounts.data?.map(account => <option key={account.id} value={account.id}>{account.account_name}</option>)}
          </select>
          {accounts.isError && <Button variant="ghost" type="button" onClick={() => void accounts.refetch()}>إعادة تحميل الحسابات</Button>}
          {accounts.isSuccess && !accounts.data.length && <p className="text-sm text-muted-foreground">مافيش حساب نشط بعملة العمولة.</p>}
        </div>
        {commission.currency !== 'EGP' && <div className="space-y-1">
          <Label htmlFor="commission-fx">سعر الصرف إلى الجنيه</Label>
          <Input id="commission-fx" type="number" min="0.000001" step="any" required value={rate} disabled={save.isPending}
            onChange={event => { setRate(event.target.value); setRequest(crypto.randomUUID()); }} />
        </div>}
        <div className="space-y-1">
          <Label htmlFor="commission-reference">مرجع إيصال {recovery ? 'التحصيل' : 'الصرف'}</Label>
          <Input id="commission-reference" required minLength={3} maxLength={200} value={reference} disabled={save.isPending}
            onChange={event => { setReference(event.target.value); setRequest(crypto.randomUUID()); }} />
        </div>
        <Button disabled={!valid || save.isPending}>{save.isPending ? 'جارٍ التسجيل…' : 'تأكيد التسجيل'}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function BookingWorkflowCommissionRows() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const [selected, setSelected] = useState<Commission>();
  const rows = useQuery({
    queryKey: ['employee-commissions', orgId, user?.id, 'booking-workflow-statement'],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Commission[]>('get_booking_commission_statement', { _org: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (rows.isPending) return <p className="text-sm text-muted-foreground">جارٍ تحميل عمولات الحجوزات…</p>;
  if (rows.isError) return <Button variant="outline" onClick={() => rows.refetch()}>تعذر تحميل العمولات. إعادة المحاولة</Button>;
  if (!rows.data.length) return <p className="text-sm text-muted-foreground">هنا تظهر العمولات بعد اعتماد تكلفة الحجز.</p>;
  return <>
    <Table>
      <TableHeader><TableRow>
        <TableHead>الحجز</TableHead><TableHead>الموظف</TableHead><TableHead>النسبة</TableHead>
        <TableHead>المستحق بعد التسويات</TableHead><TableHead>حالة الرصيد</TableHead><TableHead>الإجراء</TableHead>
      </TableRow></TableHeader>
      <TableBody>{rows.data.map(row => <TableRow key={row.id}>
        <TableCell><Link className="text-primary underline-offset-4 hover:underline"
          to={`/bookings/${row.booking_id}?tab=amendments`}>{row.booking_number}</Link></TableCell>
        <TableCell>{row.employee_name ?? '—'}</TableCell>
        <TableCell>{row.commission_rate}%</TableCell>
        <TableCell>{showAmount(row.entitlement, row.currency)}</TableCell>
        <TableCell><Badge variant="secondary">{row.cost_needs_review ? 'بانتظار مراجعة التكلفة'
          : row.signed_balance < 0 ? `فرق مطلوب تحصيله · ${showAmount(row.signed_balance, row.currency)}`
          : row.signed_balance > 0 ? `متبقي للصرف · ${showAmount(row.signed_balance, row.currency)}`
          : row.payment_status === 'cancelled' ? 'ملغاة' : 'مسوّاة'}</Badge></TableCell>
        <TableCell>{row.can_settle && row.signed_balance !== 0 && !row.cost_needs_review && <Button
          variant="outline" size="sm" onClick={() => setSelected(row)}>
          {row.signed_balance < 0 ? 'تسجيل رد الفرق' : 'تسجيل الصرف'}
        </Button>}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
    {selected && orgId && <SettlementDialog key={`${orgId}:${selected.id}`} commission={selected} orgId={orgId} onClose={() => setSelected(undefined)} />}
  </>;
}
