import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
const actions = {
  hold: { label: 'هولد ساعتين', success: 'تم حجز المقاعد مؤقتًا لمدة ساعتين' },
  book: { label: 'حجز مباشر', success: 'تم حجز المقاعد وتسجيل المسافرين داخليًا' },
  quote: { label: 'إنشاء مسودة عرض', success: 'تم إنشاء مسودة عرض السعر' },
};
type SearchAction = keyof typeof actions;

export default function PilgrimageAvailabilitySearch({ orgId, onBack, onOpenSale }: {
  orgId: string;
  onBack: () => void;
  onOpenSale: (id: string, programType: Availability['program_type']) => void;
}) {
  const { hasPermission } = usePermissionCheck();
  const { orgRole } = useOrganization();
  const canViewCustomers = hasPermission('customers_view');
  const canQuote = canViewCustomers && hasPermission('quotes_create');
  const canBook = canViewCustomers && hasPermission('bookings_create')
    && ['owner', 'admin', 'manager'].includes(orgRole ?? '');
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [submitted, setSubmitted] = useState(initialFilters);
  const [selection, setSelection] = useState<{ row: Availability; action: SearchAction } | null>(null);
  const [customer, setCustomer] = useState('');
  const [customerTerm, setCustomerTerm] = useState('');
  const [manifest, setManifest] = useState('');
  const [requestId, setRequestId] = useState('');
  const partySize = Number(submitted.party);
  const travelerNames = manifest.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const validManifest = travelerNames.length === partySize
    && travelerNames.every(name => name.length >= 3 && name.length <= 200);
  const quoteSelected = selection?.action === 'quote';
  const bookSelected = selection?.action === 'book';
  const canSubmit = quoteSelected ? canQuote : canBook && (!bookSelected || validManifest);
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
    enabled: !!selection && canViewCustomers,
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
      const { row, action } = selection;
      const common = {
        _organization_id: orgId, _request_id: requestId, _program_id: row.program_id,
        _customer_id: customer, _room_type: submitted.room, _party_size: partySize,
        _expected_unit_price: row.unit_price, _expected_currency: row.currency,
      };
      const { data, error } = action === 'quote'
        ? await callUntypedRpc<string>('create_pilgrimage_quote_from_availability', common)
        : await callUntypedRpc<string>('book_pilgrimage_from_availability', {
          ...common, _action: action, _traveler_names: bookSelected ? travelerNames : [],
          _departure_date: row.departure_date, _return_date: row.return_date,
        });
      if (error) throw error;
      if (!data) throw new Error('لم يتم استلام مرجع العملية');
      return { id: data, action, programType: row.program_type };
    },
    onSuccess: ({ id, action, programType }) => {
      qc.invalidateQueries({ queryKey: ['pilgrimage-sales', orgId] });
      if (action !== 'quote') {
        qc.invalidateQueries({ queryKey: ['pilgrimage-availability', orgId] });
        qc.invalidateQueries({ queryKey: ['pilgrimage-seat-allocations', orgId] });
        qc.invalidateQueries({ queryKey: ['pilgrimage-programs', orgId] });
        qc.invalidateQueries({ queryKey: ['pilgrims', orgId] });
      }
      toast({ title: actions[action].success });
      onOpenSale(id, programType);
    },
    onError: (error: { message?: string }) => {
      const refreshRequired = /price_changed|insufficient_unallocated|program_unavailable|program_quote_exceeds/.test(error.message ?? '');
      if (refreshRequired) {
        setSelection(null);
        refreshSearch();
      }
      toast({ title: 'تعذر حفظ العملية', variant: 'destructive', description: refreshRequired
        ? 'السعر أو التواريخ أو التوافر اتغيّر. راجع النتائج المحدثة.'
        : 'راجع الصلاحيات وبيانات العميل، ثم حاول مرة أخرى.' });
    },
  });
  const openAction = (row: Availability, action: SearchAction) => {
    setCustomer('');
    setCustomerTerm('');
    setManifest('');
    setRequestId(crypto.randomUUID());
    setSelection({ row, action });
  };
  const actionDisabled = results.isFetching || visibleResults.isFetching || visibleResults.isError;

  return <div className="space-y-5">
    <Button variant="ghost" onClick={onBack}><ArrowRight className="h-4 w-4 me-1" />العودة إلى البرامج</Button>
    <PageHeader title="بحث توافر الحج والعمرة" icon={Search}
      description="ابحث في مقاعد البرامج الداخلية واحجزها مؤقتًا أو سجّل المسافرين مباشرة." />
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
        </div>
        <div className="flex flex-wrap gap-2">
          {canBook && <>
            <Button disabled={actionDisabled} onClick={() => openAction(row, 'book')}>{actions.book.label}</Button>
            <Button variant="outline" disabled={actionDisabled} onClick={() => openAction(row, 'hold')}>{actions.hold.label}</Button>
          </>}
          {canQuote && <Button variant="ghost" disabled={actionDisabled} onClick={() => openAction(row, 'quote')}>
            {actions.quote.label}
          </Button>}
        </div>
      </Card>)}
    </div>

    <Dialog open={!!selection} onOpenChange={open => { if (!open && !create.isPending) setSelection(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selection && actions[selection.action].label} · {selection?.row.program_name}</DialogTitle>
          <DialogDescription>
            {partySize} مسافر · {ROOM[submitted.room]} · {selection && money(selection.row.unit_price * partySize, selection.row.currency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1"><Label htmlFor="availability-customer-search">بحث باسم العميل</Label>
          <Input id="availability-customer-search" maxLength={100} value={customerTerm} disabled={create.isPending}
            onChange={event => { setCustomer(''); setCustomerTerm(event.target.value); }} />
        </div>
        <div className="space-y-1"><Label htmlFor="availability-customer">العميل</Label>
          <Select value={customer} onValueChange={id => {
            setCustomer(id);
            if (bookSelected && partySize === 1) setManifest(customerQuery.data?.find(row => row.id === id)?.name ?? '');
          }} disabled={create.isPending || customerQuery.isFetching || !customerQuery.data?.length}>
            <SelectTrigger id="availability-customer"><SelectValue placeholder="اختر عميلًا من CRM" /></SelectTrigger>
            <SelectContent>{(customerQuery.data ?? []).map(row => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent>
          </Select>
          {customerQuery.isError && <p className="text-sm text-destructive">تعذر تحميل العملاء.</p>}
          {customerQuery.isSuccess && !customerQuery.data.length && <p className="text-sm text-muted-foreground">لا توجد أسماء مطابقة.</p>}
        </div>
        {bookSelected && <div className="space-y-1">
          <Label htmlFor="availability-travelers">أسماء المسافرين</Label>
          <Textarea id="availability-travelers" value={manifest} disabled={create.isPending}
            maxLength={partySize * 201} onChange={event => setManifest(event.target.value)}
            placeholder="اكتب اسم كل مسافر في سطر" />
          <p className="text-sm text-muted-foreground">{travelerNames.length} من {partySize} · الاسم من 3 إلى 200 حرف</p>
        </div>}
        {bookSelected && <p className="text-sm text-muted-foreground">التسجيل على رصيد البرنامج داخل Safar ERP. تأكيد المورد إجراء منفصل.</p>}
        {selection?.action === 'hold' && <p className="text-sm text-muted-foreground">المقاعد تفضل محجوزة ساعتين. تقدر تضيف أسماء المسافرين عند التأكيد.</p>}
        <Button disabled={!customer || !canSubmit || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'جارٍ الحفظ…' : quoteSelected ? 'حفظ وفتح المسودة' : selection && actions[selection.action].label}
        </Button>
      </DialogContent>
    </Dialog>
  </div>;
}
