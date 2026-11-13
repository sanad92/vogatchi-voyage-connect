import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSaveSopLead } from '@/hooks/useSop';
import { supabase } from '@/integrations/supabase/client';
import { formatLeadDateTime, LEAD_SOURCE_LABELS } from '@/lib/leadPipeline';
import { LEAD_STAGE_LABELS } from '@/lib/sop';
import { ROOM } from './pilgrimage-documents';

interface Props {
  organizationId: string;
  program: {
    id: string;
    name: string;
    departure_date: string | null;
    return_date: string | null;
    currency: string;
  };
  canCreate: boolean;
}

const PAGE_SIZE = 25;
const EMPTY_FORM = { name: '', phone: '', email: '', adults: '1', children: [] as string[], room: '', source: '', notes: '' };

export default function PilgrimageInterest({ organizationId, program, canCreate }: Props) {
  const campaign = `pilgrimage:${program.id}`;
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const save = useSaveSopLead();
  const requests = useQuery({
    queryKey: ['sop-leads', organizationId, campaign, page],
    queryFn: async () => {
      const { data, error } = await supabase.from('sop_leads')
        .select('id,lead_number,contact_name,contact_phone,contact_email,adults,children_count,occupancy,stage,next_follow_up_at')
        .eq('organization_id', organizationId).eq('campaign', campaign)
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      if (error) throw error;
      return data;
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate || save.isPending) return;
    const adults = Number(form.adults);
    const childrenAges = form.children.map(Number);
    if (form.name.trim().length < 2 || (!form.phone.trim() && !form.email.trim()) || !form.source) {
      toast.error('أدخل اسم العميل ووسيلة تواصل ومصدر الطلب');
      return;
    }
    if (!Number.isInteger(adults) || adults < 1 || form.children.some((age, index) =>
      !age.trim() || !Number.isInteger(childrenAges[index]) || childrenAges[index] < 0 || childrenAges[index] > 17)) {
      toast.error('راجع عدد البالغين وأعمار الأطفال');
      return;
    }
    save.mutate({
      contact_name: form.name.trim(),
      contact_phone: form.phone.trim() || null,
      contact_email: form.email.trim() || null,
      adults,
      children_count: childrenAges.length,
      children_ages: childrenAges,
      occupancy: ROOM[form.room] || null,
      destination: 'مكة والمدينة المنورة',
      check_in: program.departure_date,
      check_out: program.return_date,
      service_type: 'package',
      budget_currency: program.currency,
      reference_hotel: program.name,
      special_requests: form.notes.trim() || null,
      lead_source: form.source,
      campaign,
    }, { onSuccess: () => { setPage(0); setOpen(false); setForm(EMPTY_FORM); } });
  };

  const rows = requests.data ?? [];
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-semibold">طلبات الاهتمام بالبرنامج</h2>
          <p className="text-sm text-muted-foreground">سجّل بيانات العميل للمتابعة. الطلب لا يخصص مقاعد ولا ينشئ فاتورة.</p>
        </div>
        {canCreate && <Button onClick={() => setOpen(true)}><Plus className="me-1 h-4 w-4" />تسجيل طلب اهتمام</Button>}
      </Card>
      {requests.isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل الطلبات…</p>}
      {requests.isError && <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
        تعذر تحميل الطلبات <Button variant="outline" size="sm" onClick={() => requests.refetch()}>إعادة المحاولة</Button>
      </div>}
      {requests.isSuccess && rows.length === 0 && <Card className="p-5 text-sm text-muted-foreground">لا توجد طلبات في هذه الصفحة.</Card>}
      {rows.slice(0, PAGE_SIZE).map((row) => (
        <Card key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="font-medium">{row.contact_name || 'بدون اسم'} <span className="text-xs text-muted-foreground" dir="ltr">{row.lead_number}</span></p>
            <p className="text-sm text-muted-foreground">
              {(row.adults ?? 0) + row.children_count} مسافر · {LEAD_STAGE_LABELS[row.stage]}{row.occupancy ? ` · ${row.occupancy}` : ''}
            </p>
            <p className="text-sm text-muted-foreground" dir="ltr">{[row.contact_phone, row.contact_email].filter(Boolean).join(' · ')}</p>
            {row.next_follow_up_at && <p className="text-xs text-muted-foreground">المتابعة التالية {formatLeadDateTime(row.next_follow_up_at)}</p>}
          </div>
          <Button asChild size="sm" variant="outline"><Link to={`/sop/pipeline?lead=${row.id}`}>متابعة الطلب</Link></Button>
        </Card>
      ))}
      {(page > 0 || rows.length > PAGE_SIZE) && <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</Button>
        <Button variant="outline" size="sm" disabled={rows.length <= PAGE_SIZE} onClick={() => setPage(page + 1)}>التالي</Button>
      </div>}
      {canCreate && <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) setOpen(value); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل طلب اهتمام</DialogTitle>
            <DialogDescription>{program.name}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={submit}>
            <Label htmlFor="interest-name">اسم العميل</Label>
            <Input id="interest-name" required minLength={2} maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <p className="text-xs text-muted-foreground">أدخل رقم الهاتف أو البريد الإلكتروني.</p>
            <Label htmlFor="interest-phone">الهاتف</Label>
            <Input id="interest-phone" type="tel" dir="ltr" maxLength={35} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Label htmlFor="interest-email">البريد الإلكتروني</Label>
            <Input id="interest-email" type="email" dir="ltr" placeholder="name@example.com" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="interest-adults">البالغون</Label>
                <Input id="interest-adults" type="number" min={1} required value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interest-children">الأطفال</Label>
                <Input id="interest-children" type="number" min={0} max={20} value={form.children.length} onChange={(e) => {
                  const count = Math.min(20, Math.max(0, Math.trunc(Number(e.target.value) || 0)));
                  setForm({ ...form, children: Array.from({ length: count }, (_, index) => form.children[index] ?? '') });
                }} />
              </div>
              {form.children.map((age, index) => <div key={index} className="space-y-1.5">
                <Label htmlFor={`interest-age-${index}`}>عمر الطفل {index + 1}</Label>
                <Input id={`interest-age-${index}`} type="number" required min={0} max={17} value={age} onChange={(e) =>
                  setForm({ ...form, children: form.children.map((current, child) => child === index ? e.target.value : current) })} />
              </div>)}
            </div>
            <Label htmlFor="interest-room">الغرفة المطلوبة</Label>
            <Select value={form.room} onValueChange={(room) => setForm({ ...form, room })}>
              <SelectTrigger id="interest-room"><SelectValue placeholder="غير محددة" /></SelectTrigger>
              <SelectContent>{Object.entries(ROOM).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Label htmlFor="interest-source">مصدر الطلب</Label>
            <Select value={form.source} onValueChange={(source) => setForm({ ...form, source })}>
              <SelectTrigger id="interest-source"><SelectValue placeholder="اختر المصدر" /></SelectTrigger>
              <SelectContent>{Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Label htmlFor="interest-notes">ملاحظات</Label>
            <Textarea id="interest-notes" maxLength={2000} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'جارٍ الحفظ…' : 'حفظ طلب الاهتمام'}</Button>
          </form>
        </DialogContent>
      </Dialog>}
    </div>
  );
}
