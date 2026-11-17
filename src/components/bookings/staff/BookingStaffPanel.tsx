import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useToast } from '@/hooks/use-toast';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type EditRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  mine: boolean;
  name: string | null;
  reason: string;
  expires_at: string | null;
};

type BookingStaff = {
  operations_name: string | null;
  sales_name: string | null;
  can_request: boolean;
  can_approve: boolean;
  can_edit: boolean;
  can_approve_cost: boolean;
  cost: number | null;
  commission_profit: number | null;
  cost_needs_review: boolean;
  requests: EditRequest[];
};

export const bookingStaffQueryKey = 'booking-staff';

export function useBookingStaff(bookingId?: string | null) {
  const { user } = useOptimizedAuth();
  return useQuery({
    queryKey: [bookingStaffQueryKey, bookingId, user?.id],
    enabled: Boolean(bookingId && user?.id),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<BookingStaff>('get_booking_staff', { _booking: bookingId });
      if (error) throw error;
      return data;
    },
  });
}

const labels = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', closed: 'مقفل' };

export default function BookingStaffPanel({ bookingId, departurePath, currency, notes }: {
  bookingId: string;
  departurePath?: string;
  notes?: string | null;
  currency: string;
}) {
  const staff = useBookingStaff(bookingId);
  const [reason, setReason] = useState('');
  const [cost, setCost] = useState<string>();
  const [noteDraft, setNoteDraft] = useState<string>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const edit = useMutation({
    mutationFn: async ({ action, id }: { action: 'request' | 'approve' | 'reject' | 'close'; id?: string }) => {
      const { error } = await callUntypedRpc('change_booking_edit_request', {
        _booking: bookingId, _action: action, _request: id ?? null, _reason: action === 'request' ? reason.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void staff.refetch();
      setReason('');
      toast({ title: 'اتحدّث طلب فتح التعديل' });
    },
    onError: () => toast({ title: 'تعذر تحديث الطلب. راجع حالة الطلب وصلاحيتك.', variant: 'destructive' }),
  });

  const approve = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await callUntypedRpc('approve_booking_commission_cost', { _booking: bookingId, _cost: amount });
      if (error) throw error;
    },
    onSuccess: () => {
      setCost(undefined);
      for (const key of [bookingStaffQueryKey, 'workspace-booking', 'booking-profit-cockpit', 'unified-bookings', 'employee-commissions']) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: 'تم اعتماد تكلفة الحجز' });
    },
    onError: () => toast({ title: 'تعذر اعتماد التكلفة. راجع المبلغ وصلاحيتك.', variant: 'destructive' }),
  });

  const saveNotes = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await callUntypedRpc('save_booking_edit_notes', { _booking: bookingId, _notes: value });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspace-booking', bookingId] });
      setNoteDraft(undefined);
      toast({ title: 'تم حفظ ملاحظات الحجز' });
    },
    onError: () => toast({ title: 'تعذر الحفظ. راجع حالة الموافقة على التعديل.', variant: 'destructive' }),
  });

  if (staff.isPending) return <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات فريق الحجز…</p>;
  if (staff.isError) return <Button variant="outline" onClick={() => staff.refetch()}>تعذر تحميل بيانات الفريق. إعادة المحاولة</Button>;
  const data = staff.data;
  if (!data) return null;
  const ownOpen = data.requests.some(request => request.mine && (request.status === 'pending'
    || (request.status === 'approved' && Date.parse(request.expires_at ?? '') > Date.now())));

  return <Card className="space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">فريق الحجز وصلاحية التعديل</h3>
      <Badge variant={data.can_edit ? 'default' : 'secondary'}>{data.can_edit ? 'التعديل مفتوح لحسابك' : 'التعديل مقفول لحسابك'}</Badge>
    </div>
    <dl className="grid gap-2 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">موظف العمليات</dt><dd>{data.operations_name || 'غير مسجل'}</dd></div>
      <div><dt className="text-sm text-muted-foreground">موظف المبيعات</dt><dd>{data.sales_name || 'بيع باسم الشركة'}</dd></div>
    </dl>
    {data.can_edit && departurePath && <Button asChild size="sm" variant="outline"><Link to={departurePath}>تعديل بيانات المسافرين</Link></Button>}
    {data.can_edit && !departurePath && <form className="space-y-2" onSubmit={event => {
      event.preventDefault();
      if (noteDraft !== undefined) saveNotes.mutate(noteDraft);
    }}>
      <Label htmlFor="booking-approved-notes">ملاحظات الحجز</Label>
      <Textarea id="booking-approved-notes" maxLength={10000} value={noteDraft ?? notes ?? ''} onChange={event => setNoteDraft(event.target.value)} />
      <Button size="sm" variant="outline" disabled={noteDraft === undefined || saveNotes.isPending}>حفظ الملاحظات</Button>
    </form>}
    {data.can_request && !ownOpen && <form className="space-y-2" onSubmit={event => { event.preventDefault(); edit.mutate({ action: 'request' }); }}>
      <Label htmlFor="pilgrimage-edit-reason">سبب طلب فتح التعديل</Label>
      <Textarea id="pilgrimage-edit-reason" value={reason} minLength={3} maxLength={500} required onChange={event => setReason(event.target.value)} />
      <Button size="sm" disabled={edit.isPending || reason.trim().length < 3}>إرسال للمدير</Button>
    </form>}
    {data.requests.map(request => {
      const expired = request.status === 'approved' && Date.parse(request.expires_at ?? '') <= Date.now();
      return <div key={request.id} className="space-y-2 rounded-md border p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{request.name || (request.mine ? 'طلبك' : 'موظف الحجز')}</span>
          <Badge variant="outline">{expired ? 'انتهت المدة' : labels[request.status]}</Badge>
        </div>
        <p className="break-words">{request.reason}</p>
        {request.status === 'approved' && request.expires_at && !expired
          && <p className="text-muted-foreground">متاح حتى {new Date(request.expires_at).toLocaleString()}</p>}
        {data.can_approve && request.status === 'pending' && <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={edit.isPending} onClick={() => edit.mutate({ action: 'approve', id: request.id })}>فتح التعديل لمدة ٣٠ دقيقة</Button>
          <Button size="sm" variant="outline" disabled={edit.isPending} onClick={() => edit.mutate({ action: 'reject', id: request.id })}>رفض الطلب</Button>
        </div>}
        {(data.can_approve || request.mine) && request.status === 'approved' && !expired && <Button
          size="sm" variant="outline" disabled={edit.isPending} onClick={() => edit.mutate({ action: 'close', id: request.id })}>إقفال التعديل</Button>}
      </div>;
    })}
    {data.can_approve_cost && <form className="space-y-2 border-t pt-3" onSubmit={event => {
      event.preventDefault();
      approve.mutate(Number(cost ?? data.cost));
    }}>
      <Label htmlFor="pilgrimage-booking-cost">التكلفة المعتمدة لحساب عمولة الحجز ({currency})</Label>
      {data.cost_needs_review && <p className="text-sm text-muted-foreground">
        تغيّرت تكلفة المورد. اعتمد التكلفة الإجمالية بعد التسوية لإعادة حساب العمولة.
      </p>}
      {data.commission_profit !== null && <p className="text-sm text-muted-foreground">
        صافي الربح لحساب العمولة: {data.commission_profit.toLocaleString()} {currency}
      </p>}
      <div className="flex flex-wrap gap-2">
        <Input id="pilgrimage-booking-cost" className="w-44" type="number" min={departurePath ? "0.01" : "0"} step="0.01" required
          value={cost ?? (data.cost != null ? String(data.cost) : '')} onChange={event => setCost(event.target.value)} />
        <Button type="submit" variant="outline" disabled={approve.isPending || (cost ?? data.cost) == null || cost === ''
          || (departurePath ? !(Number(cost ?? data.cost) > 0) : Number(cost ?? data.cost) < 0)}>اعتماد التكلفة وحساب العمولة</Button>
      </div>
    </form>}
  </Card>;
}
