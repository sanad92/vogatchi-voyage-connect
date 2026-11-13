import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Agreement = {
  id: string;
  agency: string;
  operator: string;
  program: string;
  departure: string | null;
  return_date: string | null;
  currency: string;
  total: number;
  capacity: number;
  status: string;
  invoice: { number: string; paid: number; remaining: number; status: string } | null;
  roster: { id: string; name: string; room_type: string | null }[];
};

const roomNames: Record<string, string> = { single: 'فردية', double: 'ثنائية', triple: 'ثلاثية', quad: 'رباعية' };
const money = (amount: number, currency: string) => `${Number(amount).toLocaleString('ar-EG')} ${currency}`;

function AgencyAgreement({ agreement, userId }: { agreement: Agreement; userId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('none');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const add = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<string>('add_pilgrimage_b2b_roster_name', {
        _agreement_id: agreement.id, _client_key: requestId, _display_name: name.trim(),
        _room_type: room === 'none' ? null : room,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('تعذر تأكيد إضافة المسافر.');
    },
    onSuccess: async () => {
      setName('');
      setRoom('none');
      setRequestId(crypto.randomUUID());
      toast.success('تمت إضافة الاسم لكشف الوكيل.');
      await queryClient.invalidateQueries({ queryKey: ['pilgrimage-agency-portal', userId] });
    },
    onError: error => toast.error('تعذر إضافة المسافر', { description: error.message }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{agreement.program}</CardTitle>
        <p className="text-sm text-muted-foreground">{agreement.operator} · {agreement.agency}</p>
        {agreement.departure && <p className="text-sm text-muted-foreground">{agreement.departure} – {agreement.return_date || '—'}</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 rounded-lg bg-muted p-4 sm:grid-cols-2">
          <div><dt>قيمة الاتفاق</dt><dd className="font-medium">{money(agreement.total, agreement.currency)}</dd></div>
          <div><dt>الأسماء المسجلة / الحصة</dt><dd className="font-medium">{agreement.roster.length} / {agreement.capacity}</dd></div>
          {agreement.invoice ? <>
            <div><dt>المحصّل</dt><dd className="font-medium">{money(agreement.invoice.paid, agreement.currency)}</dd></div>
            <div><dt>المتبقي على الفاتورة {agreement.invoice.number}</dt>
              <dd className="font-medium">{money(agreement.invoice.remaining, agreement.currency)}</dd></div>
          </> : <div><dt>الفاتورة</dt><dd>لم تصدر بعد</dd></div>}
        </dl>
        {agreement.status === 'voided' && <p className="text-sm text-muted-foreground">الاتفاق ملغى</p>}
        <div>
          <h2 className="font-semibold">كشف المسافرين</h2>
          {agreement.roster.length
            ? <ul className="mt-2 divide-y">{agreement.roster.map(person => (
              <li key={person.id} className="flex justify-between gap-2 py-2 text-sm">
                <span>{person.name}</span><span>{roomNames[person.room_type ?? ''] ?? '—'}</span>
              </li>))}</ul>
            : <p className="mt-2 text-sm text-muted-foreground">لا توجد أسماء مسجلة.</p>}
        </div>
        {agreement.capacity > agreement.roster.length && <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
          event.preventDefault();
          if (!add.isPending && name.trim().length >= 3) add.mutate();
        }}>
          <div className="min-w-52 flex-1 space-y-1"><Label htmlFor={`agent-name-${agreement.id}`}>اسم المسافر</Label>
            <Input id={`agent-name-${agreement.id}`} value={name} required minLength={3} maxLength={200}
              onChange={event => { setName(event.target.value); setRequestId(crypto.randomUUID()); }} disabled={add.isPending} />
          </div>
          <div className="space-y-1"><Label htmlFor={`agent-room-${agreement.id}`}>فئة الغرفة</Label>
            <Select value={room} onValueChange={value => { setRoom(value); setRequestId(crypto.randomUUID()); }} disabled={add.isPending}>
              <SelectTrigger id={`agent-room-${agreement.id}`} className="min-w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">غير محددة</SelectItem>{Object.entries(roomNames).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={add.isPending || name.trim().length < 3}>إضافة للكشف</Button>
        </form>}
      </CardContent>
    </Card>
  );
}

export default function PilgrimageAgencyPortal() {
  const { user, loading, profile, signOut } = useOptimizedAuth();
  const query = useQuery({
    queryKey: ['pilgrimage-agency-portal', user?.id],
    enabled: !!user && profile?.is_active !== false,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Agreement[]>('get_pilgrimage_agency_portal');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  if (!loading && !user) return <Navigate replace to="/login?redirect=%2Fpilgrimage%2Fagency" />;

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-5 p-5 md:p-8" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">بوابة وكيل الحج والعمرة</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/">Safar ERP</Link></Button>
          {user && <Button type="button" variant="ghost" onClick={() => void signOut()}>تسجيل الخروج</Button>}
        </div>
      </div>
      {profile?.is_active === false ? <p>حسابك غير مفعّل.</p>
        : loading || query.isLoading ? <p role="status">جاري تحميل الاتفاقات...</p>
        : query.isError ? <div role="alert"><p>تعذر تحميل الاتفاقات.</p><Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button></div>
        : query.data?.length ? query.data.map(agreement => <AgencyAgreement key={agreement.id} agreement={agreement} userId={user!.id} />)
        : <p>لا توجد اتفاقات مرتبطة ببريد العمل المؤكّد. تواصل مع مشغّل البرنامج لإضافة بريدك.</p>}
    </main>
  );
}
