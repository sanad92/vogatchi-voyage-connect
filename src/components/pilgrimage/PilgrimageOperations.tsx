import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { supabase } from '@/integrations/supabase/client';
import { amount, pilgrimNetPaid } from '@/lib/pilgrimage/operations';
import { money, ROOM } from './pilgrimage-documents';

type Action = 'room_category' | 'cancel' | 'transfer';
type Room = 'quad' | 'triple' | 'double' | 'single';
type Program = {
  id: string;
  name: string;
  status: string;
  currency: string;
  program_type: string;
  travel_scope: string;
  departure_date: string | null;
} & Record<`price_${Room}`, number>;
type Passenger = {
  id: string;
  full_name: string;
  status: string;
  room_type: Room;
  total_price: number;
  paid_amount: number;
  reserved_refunds?: number;
  b2b_roster_entry_id?: string | null;
};
type History = {
  id: string;
  action: Action;
  pilgrim_id: string;
  reason: string;
  old_price: number;
  new_price: number;
  cancellation_fee: number;
  refund_id: string | null;
  replacement_id: string | null;
  created_at: string;
  request: { target_program_id?: string };
};

const ACTIONS: Record<Action, string> = {
  cancel: 'إلغاء التسجيل',
  room_category: 'تغيير فئة الغرفة',
  transfer: 'نقل إلى برنامج آخر',
};
const ERRORS: Record<string, string> = {
  pilgrimage_operation_refresh_required: 'الأسعار أو المدفوعات اتغيرت. حدّث الصفحة وراجع التسوية.',
  pilgrimage_passenger_not_changeable: 'الطلب يشمل مسافرًا لم يعد متاحًا للتعديل.',
  pilgrimage_transfer_program_unavailable: 'البرنامج البديل غير متاح، أو العملة أو نوع المسار مختلف.',
  pilgrimage_refund_customer_required: 'اربط المسافر بملف عميل قبل إنشاء طلب استرداد.',
  pilgrimage_refund_payment_required: 'راجع الدفعات الأصلية وسعر التحويل مع المالية.',
  program_capacity_reached: 'البرنامج البديل مكتمل.',
  program_capacity_reserved_by_existing_allocations: 'المقاعد المتاحة محجوزة مؤقتًا لطلبات أخرى.',
  pilgrimage_operation_denied: 'لا توجد صلاحية لتنفيذ الإجراء على البرنامج.',
  room_capacity_exceeded: 'الغرفة المختارة مكتملة.',
  room_category_conflict: 'رقم الغرفة مسجل لفئة مختلفة.',
  room_family_group_required: 'تأكد من تسجيل المجموعة العائلية قبل التسكين المشترك.',
};

const db = supabase as any;

export default function PilgrimageOperations({ orgId, program, programs, passengers, canManage, canCancel, canViewRefunds, onChanged }: {
  orgId: string;
  program: Program;
  programs: Program[];
  passengers: Passenger[];
  canManage: boolean;
  canCancel: boolean;
  canViewRefunds: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const cache = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [fees, setFees] = useState<Record<string, string>>({});
  const [room, setRoom] = useState<Room>('quad');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [approved, setApproved] = useState(false);
  const [submission, setSubmission] = useState<object[] | null>(null);

  const history = useQuery<History[]>({
    queryKey: ['pilgrimage-operations', orgId, program.id],
    queryFn: async () => {
      const { data, error } = await db.from('pilgrimage_operations')
        .select('id,action,pilgrim_id,reason,old_price,new_price,cancellation_fee,refund_id,replacement_id,created_at,request')
        .eq('organization_id', orgId).eq('program_id', program.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const active = passengers.filter((person) => !person.b2b_roster_entry_id && !['cancelled', 'traveled', 'completed'].includes(person.status));
  const targets = programs.filter((option) => option.id !== program.id && option.status === 'open'
    && option.program_type === program.program_type && option.currency === program.currency && option.travel_scope === program.travel_scope);
  const destination = action === 'transfer' ? targets.find((option) => option.id === targetId) : program;
  const newPrice = action === 'cancel' ? 0 : amount(destination?.[`price_${room}`]);
  const selectedPassengers = active.filter((person) => selected[person.id]);
  const feeFor = (person: Passenger) => action === 'room_category' ? 0 : Number(fees[person.id] || 0);
  const hasInvalidFee = selectedPassengers.some((person) => {
    const fee = feeFor(person);
    return !Number.isFinite(fee) || fee < 0 || fee > person.total_price || Math.abs(Math.round(fee * 100) - fee * 100) > 1e-7;
  });
  const setTarget = (id: string, checked: boolean) => {
    setApproved(false);
    setSelected((current) => {
      if (checked) return { ...(action === 'cancel' ? current : {}), [id]: current[id] ?? crypto.randomUUID() };
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  const open = (next: Action) => {
    setAction(next);
    setSelected({});
    setFees({});
    setTargetId('');
    setReason('');
    setApproved(false);
    setSubmission(null);
  };

  const apply = useMutation({
    mutationFn: async (requests: object[]) => {
      const { error } = await callUntypedRpc('apply_pilgrimage_operations', { _organization_id: orgId, _program_id: program.id, _requests: requests });
      if (error) throw error;
    },
    onSuccess: () => {
      setAction(null);
      setSubmission(null);
      void cache.invalidateQueries({ queryKey: ['pilgrimage-operations', orgId, program.id] });
      void cache.invalidateQueries({ queryKey: ['refund-balances', orgId] });
      onChanged();
      toast({ title: 'تم تنفيذ الإجراء وحفظه في سجل العمليات' });
    },
    onError: (error: { message?: string; code?: string }) => {
      if (error.code) {
        setSubmission(null);
        setApproved(false);
        onChanged();
      }
      toast({ title: 'تعذر تنفيذ الإجراء', description: ERRORS[error.message ?? ''] ?? error.message, variant: 'destructive' });
    },
  });

  const submit = () => {
    const requests = submission ?? selectedPassengers.map((person) => ({
        id: selected[person.id], pilgrim_id: person.id, action, reason: reason.trim(), fee: feeFor(person),
        room_type: action === 'cancel' ? null : room, target_program_id: action === 'transfer' ? targetId : null,
        expected_price: person.total_price, expected_new_price: newPrice, expected_net_paid: pilgrimNetPaid(person),
        expected_room_type: person.room_type,
      }));
    setSubmission(requests);
    apply.mutate(requests);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">تعديلات وإلغاءات المعتمرين</h2>
        {canManage && !['departed', 'completed', 'cancelled'].includes(program.status) && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!active.length} onClick={() => open('room_category')}>{ACTIONS.room_category}</Button>
            {canCancel && <Button variant="outline" disabled={!active.length || !targets.length} onClick={() => open('transfer')}>{ACTIONS.transfer}</Button>}
            {canCancel && <Button variant="destructive" disabled={!active.length} onClick={() => open('cancel')}>{ACTIONS.cancel}</Button>}
          </div>
        )}
        {passengers.some((person) => person.b2b_roster_entry_id) && <p className="text-sm text-muted-foreground">تعديل وإلغاء تسجيلات الوكلاء من اتفاق الوكيل في عروض البيع.</p>}
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-medium">سجل العمليات</h3>
        {history.isPending && <p className="text-sm text-muted-foreground">جارٍ تحميل السجل…</p>}
        {history.isError && <p className="text-sm text-destructive">تعذر تحميل سجل العمليات.</p>}
        {history.isSuccess && history.data.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة.</p>}
        {history.data?.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
            <div>
              <p className="font-medium">{ACTIONS[item.action]} · {passengers.find((person) => person.id === item.pilgrim_id)?.full_name || 'معتمر'}</p>
              <p className="text-muted-foreground">{item.reason} · {new Date(item.created_at).toLocaleString('ar-EG')}</p>
              <p>{item.action === 'room_category' ? `${money(item.old_price, program.currency)} ← ${money(item.new_price, program.currency)}`
                : `غرامة ${money(item.cancellation_fee, program.currency)}`}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.refund_id && canViewRefunds && <Button asChild variant="outline" size="sm"><Link to={`/refund-balances?kind=customer&refund=${item.refund_id}&view=all`}>طلب الاسترداد</Link></Button>}
              {item.replacement_id && item.request.target_program_id && <Button asChild variant="outline" size="sm"><Link to={`/pilgrimage?program=${item.request.target_program_id}&passenger=${item.replacement_id}`}>التسجيل البديل</Link></Button>}
            </div>
          </div>
        ))}
      </Card>
      <Dialog open={!!action} onOpenChange={(value) => { if (!value && !apply.isPending) setAction(null); }}>
        {action && <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{ACTIONS[action]}</DialogTitle>
            <DialogDescription>{action === 'transfer'
              ? 'يُغلق التسجيل القديم ويُنشأ تسجيل جديد. مستحقات القديم تُراجع في المالية، والتسجيل البديل يبدأ من دون دفعة.'
              : action === 'room_category'
                ? 'تتغير تعرفة المعتمر، وتقدر توزعه على مجموعة من الفئة الجديدة من تبويب التسكين.'
                : 'تتحرر مقاعد المعتمرين المختارين ويُسجل أي مبلغ زائد عن الغرامة كطلب استرداد.'}</DialogDescription>
          </DialogHeader>
          <fieldset disabled={Boolean(submission)} className="space-y-3 disabled:opacity-60">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-2">
            {active.map((person) => (
              <div key={person.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Checkbox id={`operation-${person.id}`} checked={!!selected[person.id]}
                  disabled={apply.isPending || (action === 'cancel' && selectedPassengers.length >= 100 && !selected[person.id])}
                  onCheckedChange={(checked) => setTarget(person.id, checked === true)} />
                <Label htmlFor={`operation-${person.id}`}>{person.full_name} · {ROOM[person.room_type]}</Label>
              </div>
            ))}
          </div>
          {action === 'transfer' && <div className="space-y-1">
            <Label htmlFor="pilgrimage-operation-target">البرنامج البديل</Label>
            <Select value={targetId} onValueChange={(value) => { setTargetId(value); setApproved(false); }}>
              <SelectTrigger id="pilgrimage-operation-target"><SelectValue placeholder="اختر برنامجًا مفتوحًا" /></SelectTrigger>
              <SelectContent>{targets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name} · {target.departure_date}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          {action !== 'cancel' && <div className="space-y-1">
            <Label htmlFor="pilgrimage-operation-room">فئة الغرفة الجديدة</Label>
            <Select value={room} onValueChange={(value) => { setRoom(value as Room); setApproved(false); }}>
              <SelectTrigger id="pilgrimage-operation-room"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROOM).map(([key, label]) => <SelectItem key={key} value={key} disabled={amount(destination?.[`price_${key as Room}`]) <= 0}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          {selectedPassengers.map((person) => {
            const due = action === 'room_category' ? newPrice : feeFor(person);
            const paid = pilgrimNetPaid(person);
            return <div key={person.id} className="space-y-2 rounded-md border p-3 text-sm">
              <p className="font-medium">{person.full_name}</p>
              {action !== 'room_category' && <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`operation-fee-${person.id}`}>الغرامة</Label>
                <Input className="w-28" id={`operation-fee-${person.id}`} type="number" min={0} max={person.total_price} step="0.01"
                  value={fees[person.id] ?? '0'} onChange={(event) => { setFees({ ...fees, [person.id]: event.target.value }); setApproved(false); }} />
              </div>}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>المبلغ المحصل المتاح {money(paid, program.currency)}</span>
                <span>متبقي {money(Math.max(0, due - paid), program.currency)}</span>
                <span>طلب رد {money(Math.max(0, paid - due), program.currency)}</span>
                {action === 'transfer' && <span>سعر البديل {money(newPrice, program.currency)}</span>}
              </div>
            </div>;
          })}
          <div className="space-y-1">
            <Label htmlFor="pilgrimage-operation-reason">سبب الإجراء أو مرجع الموافقة</Label>
            <Textarea id="pilgrimage-operation-reason" rows={2} maxLength={500} value={reason}
              onChange={(event) => { setReason(event.target.value); setApproved(false); }} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pilgrimage-operation-approved" checked={approved} onCheckedChange={(value) => setApproved(value === true)} />
            <Label htmlFor="pilgrimage-operation-approved">راجعت الشروط والغرامة مع العميل</Label>
          </div>
          </fieldset>
          <Button disabled={apply.isPending || (!submission && (!approved || !selectedPassengers.length || hasInvalidFee || reason.trim().length < 3 ||
            (action !== 'cancel' && newPrice <= 0) || (action === 'room_category' && selectedPassengers[0]?.room_type === room)))}
            onClick={submit}>{submission && !apply.isPending ? 'إعادة محاولة التنفيذ' : 'تأكيد التنفيذ'}</Button>
        </DialogContent>}
      </Dialog>
    </div>
  );
}
