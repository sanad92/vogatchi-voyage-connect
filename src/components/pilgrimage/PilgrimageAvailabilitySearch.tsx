import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money, ROOM } from './pilgrimage-documents';

type Availability = {
  program_id: string;
  program_name: string;
  program_type: 'hajj' | 'umrah';
  departure_date: string;
  return_date: string | null;
  makkah_hotel: string | null;
  madinah_hotel: string | null;
  currency: string;
  unit_price: number;
  available_seats: number | null;
};

const labels = { umrah: 'عمرة', hajj: 'حج' };
const initialFilters = { type: 'all', from: '', to: '', party: '1', room: 'quad' };
const alternativeLimit = 5;

export default function PilgrimageAvailabilitySearch({ orgId, onBack, onOpenQuote }: {
  orgId: string;
  onBack: () => void;
  onOpenQuote: (id: string) => void;
}) {
  const { hasPermission } = usePermissionCheck();
  const canCreate = hasPermission('quotes_create') && hasPermission('customers_view');
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [submitted, setSubmitted] = useState(initialFilters);
  const [selection, setSelection] = useState<Availability | null>(null);
  const [customer, setCustomer] = useState('');
  const [customerTerm, setCustomerTerm] = useState('');
  const [requestId, setRequestId] = useState('');
  const partySize = Number(submitted.party);
  const validFilters = Number.isInteger(Number(filters.party)) && Number(filters.party) >= 1
    && Number(filters.party) <= 10000 && (!filters.from || !filters.to || filters.from <= filters.to);
  const searchKey = ['pilgrimage-availability', orgId, submitted] as const;
  const searchArgs = {
    _organization_id: orgId,
    _program_type: submitted.type === 'all' ? null : submitted.type,
    _party_size: partySize,
    _room_type: submitted.room,
  };

  const results = useQuery({
    queryKey: searchKey,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Availability[]>('search_pilgrimage_availability', {
        ...searchArgs,
        _departure_from: submitted.from || null,
        _departure_to: submitted.to || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
  const noMatches = results.isSuccess && results.data.length === 0;
  const suggestDates = noMatches && Boolean(submitted.from || submitted.to);
  const alternatives = useQuery({
    queryKey: [...searchKey, 'alternatives'],
    enabled: suggestDates,
    queryFn: async () => {
      const { from, to } = submitted;
      const searchOutside = async (boundary: string, before: boolean) => {
        if (!boundary) return [];

        const { data, error } = await callUntypedRpc<Availability[]>('search_pilgrimage_availability', {
          ...searchArgs,
          _departure_from: before ? null : boundary,
          _departure_to: before ? boundary : null,
        }, query => {
          // Only suggest programs with enough known seats.
          const outside = before ? query.lt('departure_date', boundary) : query.gt('departure_date', boundary);
          return outside.gte('available_seats', partySize)
            .order('departure_date', { ascending: !before })
            .order('program_name')
            .order('program_id')
            .limit(alternativeLimit);
        });
        if (error) throw error;
        return (data ?? []).map(row => ({
          row,
          distance: Math.abs(Date.parse(row.departure_date) - Date.parse(boundary)),
        }));
      };
      const [earlier, later] = await Promise.all([searchOutside(from, true), searchOutside(to, false)]);
      return [...earlier, ...later]
        .sort((a, b) => a.distance - b.distance || a.row.departure_date.localeCompare(b.row.departure_date))
        .slice(0, alternativeLimit)
        .map(({ row }) => row);
    },
  });
  const visibleResults = suggestDates ? alternatives : results;
  const refreshSearch = () => qc.invalidateQueries({ queryKey: searchKey });

  const customerQuery = useQuery({
    queryKey: ['pilgrimage-availability-customers', orgId, customerTerm],
    enabled: !!selection && canCreate,
    queryFn: async () => {
      const term = customerTerm.trim().replace(/[%_\\]/g, '');
      let query = supabase.from('customers').select('id,name').eq('organization_id', orgId).is('archived_at', null);
      if (term) query = query.ilike('name', `%${term}%`);
      const { data, error } = await query.order('name').limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!selection || !customer) throw new Error('اختر العميل');
      const { data, error } = await callUntypedRpc<string>('create_pilgrimage_quote_from_availability', {
        _organization_id: orgId, _request_id: requestId, _program_id: selection.program_id,
        _customer_id: customer, _party_size: partySize, _room_type: submitted.room,
        _expected_unit_price: selection.unit_price, _expected_currency: selection.currency,
      });
      if (error) throw error;
      if (!data) throw new Error('لم يتم استلام رقم العرض');
      return data;
    },
    onSuccess: id => {
      qc.invalidateQueries({ queryKey: ['pilgrimage-sales', orgId] });
      toast({ title: 'تم إنشاء مسودة عرض السعر' });
      onOpenQuote(id);
    },
    onError: (error: { message?: string }) => {
      const refreshRequired = /price_changed|insufficient_unallocated|program_unavailable/.test(error.message ?? '');
      if (refreshRequired) {
        setSelection(null);
        refreshSearch();
      }
      toast({ title: 'تعذر إنشاء عرض السعر', variant: 'destructive', description: refreshRequired
        ? 'السعر أو التوافر اتغير. راجع النتائج المحدثة.'
        : 'راجع صلاحية إنشاء العرض وبيانات العميل، ثم حاول مرة أخرى.' });
    },
  });

  return <div className="space-y-5">
    <Button variant="ghost" onClick={onBack}><ArrowRight className="h-4 w-4 me-1" />العودة إلى البرامج</Button>
    <PageHeader title="بحث توافر الحج والعمرة" icon={Search}
      description="ابحث في مقاعد البرامج الداخلية وابدأ عرض سعر للعميل." />
    <Card className="p-4">
      <form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={event => {
        event.preventDefault();
        if (!validFilters) return;
        if (JSON.stringify(filters) === JSON.stringify(submitted)) refreshSearch();
        else setSubmitted(filters);
      }}>
        <div className="space-y-1"><Label htmlFor="availability-type">نوع البرنامج</Label>
          <Select value={filters.type} onValueChange={type => setFilters(current => ({ ...current, type }))}>
            <SelectTrigger id="availability-type"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">الكل</SelectItem>
              <SelectItem value="umrah">العمرة</SelectItem><SelectItem value="hajj">الحج</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label htmlFor="availability-from">السفر من</Label>
          <Input id="availability-from" type="date" value={filters.from}
            onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} />
        </div>
        <div className="space-y-1"><Label htmlFor="availability-to">السفر إلى</Label>
          <Input id="availability-to" type="date" min={filters.from || undefined} value={filters.to}
            onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} />
        </div>
        <div className="space-y-1"><Label htmlFor="availability-party">عدد المسافرين</Label>
          <Input id="availability-party" type="number" min={1} max={10000} required value={filters.party}
            onChange={event => setFilters(current => ({ ...current, party: event.target.value }))} />
        </div>
        <div className="space-y-1"><Label htmlFor="availability-room">فئة الغرفة</Label>
          <Select value={filters.room} onValueChange={room => setFilters(current => ({ ...current, room }))}>
            <SelectTrigger id="availability-room"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ROOM).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={!validFilters || results.isFetching || (suggestDates && alternatives.isFetching)}><Search className="h-4 w-4 me-1" />بحث</Button>
      </form>
    </Card>

    <p className="text-sm text-muted-foreground">التوافر لمقاعد البرنامج. فئة الغرفة تحدد سعر الفرد، وتأكيد الغرفة من المورد له إجراء منفصل.</p>
    {results.isLoading && <p role="status">جاري تحميل التوافر…</p>}
    {results.isError && <Card className="flex items-center justify-between gap-3 p-4" role="alert">
      <p>تعذر تحميل التوافر. راجع الصلاحيات أو حاول مرة أخرى.</p>
      <Button variant="outline" onClick={() => results.refetch()}>إعادة المحاولة</Button>
    </Card>}
    {noMatches && <Card className="p-6 text-center">مفيش برامج مطابقة للفترة والعدد وفئة الغرفة.</Card>}
    {suggestDates && alternatives.isLoading && <p role="status">جاري البحث عن مواعيد بديلة…</p>}
    {suggestDates && alternatives.isError && <Card className="flex items-center justify-between gap-3 p-4" role="alert">
      <p>تعذر تحميل المواعيد البديلة.</p>
      <Button variant="outline" onClick={() => alternatives.refetch()}>إعادة المحاولة</Button>
    </Card>}
    {suggestDates && alternatives.isSuccess && (alternatives.data.length > 0
      ? <h2 className="text-lg font-semibold">أقرب مواعيد متاحة</h2>
      : <p className="text-sm text-muted-foreground">مفيش مواعيد بديلة فيها مقاعد كفاية لنفس الطلب.</p>)}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(visibleResults.data ?? []).map(row => <Card key={row.program_id} className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="font-semibold">{row.program_name}</h2>
            <p className="text-sm text-muted-foreground">{labels[row.program_type]} · <span dir="ltr">{row.departure_date}</span>{row.return_date && <> إلى <span dir="ltr">{row.return_date}</span></>}</p>
          </div>
          <Badge variant="outline">{row.available_seats === null ? 'السعة غير محددة' : `${row.available_seats} مقعد متاح`}</Badge>
        </div>
        {(row.makkah_hotel || row.madinah_hotel) && <p className="text-sm">{[row.makkah_hotel && `مكة: ${row.makkah_hotel}`, row.madinah_hotel && `المدينة: ${row.madinah_hotel}`].filter(Boolean).join(' · ')}</p>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">سعر الفرد · {ROOM[submitted.room]}</p>
            <p className="font-semibold">{money(row.unit_price, row.currency)}</p>
            <p className="text-sm text-muted-foreground">الإجمالي لـ {partySize} · {money(row.unit_price * partySize, row.currency)}</p>
          </div>
          {canCreate && <Button disabled={results.isFetching || visibleResults.isFetching || visibleResults.isError} onClick={() => {
            setCustomer(''); setCustomerTerm(''); setRequestId(crypto.randomUUID()); setSelection(row);
          }}>إنشاء مسودة عرض</Button>}
        </div>
      </Card>)}
    </div>

    <Dialog open={!!selection} onOpenChange={open => { if (!open && !create.isPending) setSelection(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>عرض سعر · {selection?.program_name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{partySize} مسافر · {ROOM[submitted.room]} · {selection && money(selection.unit_price * partySize, selection.currency)}</p>
        <div className="space-y-1"><Label htmlFor="availability-customer-search">بحث باسم العميل</Label>
          <Input id="availability-customer-search" maxLength={100} value={customerTerm}
            onChange={event => { setCustomer(''); setCustomerTerm(event.target.value); }} />
        </div>
        <div className="space-y-1"><Label htmlFor="availability-customer">العميل</Label>
          <Select value={customer} onValueChange={setCustomer} disabled={customerQuery.isFetching || !customerQuery.data?.length}>
            <SelectTrigger id="availability-customer"><SelectValue placeholder="اختر عميلًا من CRM" /></SelectTrigger>
            <SelectContent>{(customerQuery.data ?? []).map(row => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent>
          </Select>
          {customerQuery.isError && <p className="text-sm text-destructive">تعذر تحميل العملاء.</p>}
          {customerQuery.isSuccess && !customerQuery.data.length && <p className="text-sm text-muted-foreground">لا توجد أسماء مطابقة.</p>}
        </div>
        <Button disabled={!customer || !canCreate || create.isPending} onClick={() => create.mutate()}>حفظ وفتح المسودة</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
