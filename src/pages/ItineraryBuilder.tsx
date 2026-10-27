import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuotes, type QuoteItem } from '@/hooks/useQuotes';
import { useOrgId } from '@/hooks/useOrgId';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { validateItinerary } from '@/lib/itineraryValidation';
import { priceItineraryLine } from '@/lib/itineraryPricing';

type Currency = 'EGP' | 'SAR' | 'USD' | 'EUR' | 'AED';
type ServiceType = 'hotel' | 'flight' | 'transport' | 'service';
type PackageType = 'flight' | 'hotel' | 'flight_hotel' | 'full';
const packageOptions: { value: PackageType; title: string; description: string; types: ServiceType[] }[] = [
  { value: 'flight', title: 'طيران فقط', description: 'تذاكر الطيران والمسافرون', types: ['flight'] },
  { value: 'hotel', title: 'فنادق فقط', description: 'الفنادق والغرف والوجبات', types: ['hotel'] },
  { value: 'flight_hotel', title: 'طيران + فنادق', description: 'تذاكر الطيران والإقامة', types: ['flight', 'hotel'] },
  { value: 'full', title: 'طيران + فنادق + انتقالات', description: 'برنامج سفر شامل', types: ['flight', 'hotel', 'transport'] },
];
type Line = { id: string; type: ServiceType; description: string; currency: Currency; cost: number; quantity: number; markupType: 'percent' | 'fixed' | 'manual'; markup: number; details: string; hotel?: { checkIn: string; checkOut: string; room: string; board: string }; flight?: { from: string; to: string; airline: string; number: string }; transport?: { pickup: string; dropoff: string; date: string } };
const currencies: Currency[] = ['EGP', 'SAR', 'USD', 'EUR', 'AED'];
const labels: Record<ServiceType, string> = { hotel: 'فندق وغرف', flight: 'طيران', transport: 'انتقالات', service: 'خدمة أخرى' };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const newLine = (type: ServiceType): Line => ({ id: crypto.randomUUID(), type, description: '', currency: 'EGP', cost: 0, quantity: 1, markupType: 'percent', markup: 15, details: '' });
export default function ItineraryBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceQuoteId = searchParams.get('revise');
  const loadedRevision = useRef<string | null>(null);
  const orgId = useOrgId();
  const { createQuote } = useQuotes();
  const { data: orgCurrency, isLoading: currencyLoading } = useQuery({
    queryKey: ['itinerary-org-currency', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('organization_settings').select('currency').eq('organization_id', orgId!).single();
      if (error) throw error;
      return data.currency as string;
    },
  });
  const supportedOrgCurrency = currencies.includes(orgCurrency as Currency) ? orgCurrency as Currency : null;
  const [packageType, setPackageType] = useState<PackageType>('flight_hotel');
  const [customer, setCustomer] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const currency = supportedOrgCurrency ?? 'EGP';
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [rates, setRates] = useState<Record<Currency, number>>({ EGP: 0, SAR: 0, USD: 0, EUR: 0, AED: 0 });
  const [lines, setLines] = useState<Line[]>([newLine('flight'), newLine('hotel')]);
  const { data: revision, isLoading: revisionLoading, isError: revisionError } = useQuery({
    queryKey: ['itinerary-revision', orgId, sourceQuoteId],
    enabled: !!orgId && !!sourceQuoteId,
    queryFn: async () => {
      const { data: quote, error } = await supabase.from('quotes').select('*').eq('organization_id', orgId!).eq('id', sourceQuoteId!).single();
      if (error) throw error;
      const { data: items, error: itemsError } = await supabase.from('quote_items').select('*').eq('organization_id', orgId!).eq('quote_id', sourceQuoteId!).order('sort_order');
      if (itemsError) throw itemsError;
      if (!items?.length || !items.every(item => (item.details as Record<string, unknown> | null)?.itinerary_builder === true)) throw new Error('هذا العرض ليس برنامجًا سياحيًا قابلًا للمراجعة');
      return { quote, items };
    },
  });
  useEffect(() => {
    if (!sourceQuoteId || !revision || loadedRevision.current === sourceQuoteId) return;
    loadedRevision.current = sourceQuoteId;
    const { quote, items } = revision;
    setCustomer(quote.customer_name || '');
    setDestination(quote.destination || '');
    setStart(quote.travel_date || '');
    setEnd(quote.return_date || '');
    const first = (items[0].details || {}) as Record<string, any>;
    const travelers = first.travelers || {};
    setAdults(Number(travelers.adults ?? quote.number_of_travelers ?? 1));
    setChildren(Number(travelers.children ?? 0));
    setInfants(Number(travelers.infants ?? 0));
    const savedRates = first.fx_snapshot as Record<Currency, number> | undefined;
    if (savedRates) setRates(savedRates);
    const types = items.map(item => item.item_type);
    setPackageType(types.includes('transport') ? 'full' : types.includes('flight') && types.includes('hotel') ? 'flight_hotel' : types.includes('flight') ? 'flight' : 'hotel');
    setLines(items.map(item => {
      const details = (item.details || {}) as Record<string, any>;
      return {
        id: crypto.randomUUID(), type: item.item_type as ServiceType, description: item.description,
        currency: currencies.includes(details.source_currency) ? details.source_currency as Currency : currency,
        cost: Number(details.source_cost ?? item.cost_price), quantity: item.quantity,
        markupType: ['percent', 'fixed', 'manual'].includes(details.markup_type) ? details.markup_type : 'manual',
        markup: Number(details.markup_value ?? item.total_selling),
        details: String(details.service_details || ''), hotel: details.hotel, flight: details.flight, transport: details.transport,
      };
    }));
  }, [revision, sourceQuoteId]);
  const selectedPackage = packageOptions.find(option => option.value === packageType)!;
  const selectPackage = (value: PackageType) => {
    setPackageType(value);
    const selected = packageOptions.find(option => option.value === value)!;
    setLines(current => {
      const kept = current.filter(line => selected.types.includes(line.type) || line.type === 'service');
      const missing = selected.types.filter(type => !kept.some(line => line.type === type));
      return [...kept, ...missing.map(type => newLine(type))];
    });
  };
  const [flightAdultFare, setFlightAdultFare] = useState(0);
  const [flightChildFare, setFlightChildFare] = useState(0);
  const [flightInfantFare, setFlightInfantFare] = useState(0);
  const change = (id: string, patch: Partial<Line>) => setLines(old => old.map(line => line.id === id ? { ...line, ...patch } : line));
  const changeExtra = (line: Line, kind: 'hotel' | 'flight' | 'transport', key: string, value: string) => change(line.id, { [kind]: { ...line[kind], [key]: value } });
  const amounts = useMemo(() => lines.map(line => {
    const priced = priceItineraryLine({ cost: line.cost, quantity: line.quantity, exchangeRate: line.currency === currency ? 1 : rates[line.currency], markupType: line.markupType, markup: line.markup });
    return { base: priced.totalCost, sale: priced.totalSale, costPrice: priced.costPrice, sellingPrice: priced.sellingPrice };
  }), [lines, rates, currency]);
  const totalCost = round(amounts.reduce((sum, x) => sum + x.base, 0));
  const totalSale = round(amounts.reduce((sum, x) => sum + x.sale, 0));
  const hasLoss = amounts.some(x => x.sale < x.base);
  const invalidCalculatedAmount = amounts.some(x => !Number.isFinite(x.base) || !Number.isFinite(x.sale) || x.base <= 0 || x.sale <= 0 || x.base > 1e12 || x.sale > 1e12);
  const valid = !invalidCalculatedAmount && !!supportedOrgCurrency && !!orgId && !!customer.trim() && !!destination.trim() && adults + children + infants > 0 && (!start || !end || end >= start) && lines.length > 0 && lines.every((l, i) => l.description.trim() && Number.isInteger(l.quantity) && l.quantity > 0 && Number.isFinite(l.cost) && l.cost > 0 && Number.isFinite(l.markup) && l.markup >= 0 && (l.currency === currency || (Number.isFinite(rates[l.currency]) && rates[l.currency] > 0)) && Number.isFinite(amounts[i].base) && amounts[i].base > 0 && Number.isFinite(amounts[i].sale) && amounts[i].sale > 0);
  const addFlightFares = () => {
    const fares = [flightAdultFare, flightChildFare, flightInfantFare];
    if (fares.some(fare => !Number.isFinite(fare) || fare < 0)) return toast.error('أسعار الطيران غير صحيحة');
    const cost = round(flightAdultFare * adults + flightChildFare * children + flightInfantFare * infants);
    if (!supportedOrgCurrency) return toast.error('عملة الشركة غير متاحة');
    if (cost <= 0) return toast.error('أدخل أسعار تذاكر الطيران أولاً');
    setLines(old => [...old, { ...newLine('flight'), description: 'تذاكر طيران للمسافرين', currency, cost, quantity: 1, details: 'تذاكر طيران للمسافرين' }]);
  };
  const save = async () => {
    if (sourceQuoteId && (revisionLoading || revisionError || !revision)) return toast.error('تعذر تحميل العرض الأصلي للمراجعة');
    const errors = validateItinerary({ customer, destination, travelers: { adults, children, infants }, start, end, lines, rates, quoteCurrency: currency });
    if (errors.length) return toast.error(errors[0]);
    if (invalidCalculatedAmount) return toast.error('يوجد مبلغ غير صحيح أو يتجاوز الحد المسموح؛ راجع الأسعار وسعر الصرف');
    if (!supportedOrgCurrency) return toast.error('تعذر تحديد عملة الشركة المدعومة؛ راجع إعدادات الشركة');
    if (!valid) return toast.error('راجع العميل والوجهة والبنود وأسعار الصرف');
    const items: QuoteItem[] = lines.map((line, i) => ({
      item_type: line.type, description: line.description, cost_price: amounts[i].costPrice,
      selling_price: amounts[i].sellingPrice, quantity: line.quantity,
      total_cost: amounts[i].base, total_selling: amounts[i].sale, sort_order: i,
      details: { itinerary_builder: true, service_details: line.details, hotel: line.hotel, flight: line.flight, transport: line.transport, source_currency: line.currency,
        source_cost: line.cost, exchange_rate: line.currency === currency ? 1 : rates[line.currency],
        quote_currency: currency, markup_type: line.markupType, markup_value: line.markup,
        travelers: { adults, children, infants }, fx_snapshot: rates }
    }));
    try {
      await createQuote.mutateAsync({
        customer_id: null, customer_name: customer.trim(), destination: destination.trim(),
        travel_date: start || null, return_date: end || null, number_of_travelers: adults + children + infants,
        notes: (sourceQuoteId ? 'Revised from quote: ' + sourceQuoteId + ' | ' : '') + 'Itinerary Builder | Package: ' + packageType + ' | Currency: ' + currency + ' | Adults: ' + adults + ' | Children: ' + children + ' | Infants: ' + infants,
        discount_amount: 0, vat_rate: 0, valid_until: null, assigned_employee_id: null, status: 'draft', items
      });
      navigate('/quotes');
    } catch { /* Existing mutation displays the error toast. */ }
  };
  return <div dir="rtl" className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
    {sourceQuoteId && <div className="rounded-lg border p-3 text-sm">{revisionLoading ? 'جاري تحميل العرض للمراجعة...' : revisionError ? 'تعذر تحميل العرض الأصلي؛ لن يتم السماح بالحفظ' : 'أنت تنشئ نسخة جديدة قابلة للتعديل من العرض الأصلي؛ لن يتم تغيير العرض القديم أو الموافقات عليه.'}</div>}
    <div className="flex items-center justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-bold">Safar Itinerary Builder</h1><p className="text-muted-foreground">منشئ البرامج السياحية وعروض الأسعار</p></div><Button variant="outline" onClick={() => navigate('/quotes')}>عروض الأسعار</Button></div>
    <Card><CardHeader><CardTitle>1. اختر نوع عرض السعر</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {packageOptions.map(option => <button key={option.value} type="button" aria-pressed={packageType === option.value} onClick={() => selectPackage(option.value)} className={`rounded-xl border-2 p-4 text-right transition-colors ${packageType === option.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
        <strong className="block mb-2">{option.title}</strong><span className="text-xs text-muted-foreground">{option.description}</span>
      </button>)}
      <p className="col-span-full text-xs text-muted-foreground">عند تغيير النوع، يتم الاحتفاظ ببيانات الخدمات المشتركة والخدمات الإضافية، وإزالة البنود غير الداخلة في النوع الجديد.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>2. بيانات الرحلة والمسافرين</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-3 gap-4">
      <div><Label>اسم العميل</Label><Input value={customer} onChange={e => setCustomer(e.target.value)}/></div>
      <div><Label>الوجهة</Label><Input value={destination} onChange={e => setDestination(e.target.value)}/></div>
      <div><Label>عملة البيع (عملة الشركة)</Label><Input value={currencyLoading ? 'جاري تحميل عملة الشركة...' : supportedOrgCurrency ?? 'عملة غير مدعومة'} disabled /><p className="text-xs text-muted-foreground mt-1">يتم حفظ عروض الأسعار بعملة الشركة المعتمدة. يمكنك إدخال تكلفة المورد بعملة مختلفة وتحديد سعر تحويلها.</p></div>
      <div><Label>المغادرة</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)}/></div><div><Label>العودة</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)}/></div>
      {([['بالغين', adults, setAdults], ['أطفال', children, setChildren], ['رضع', infants, setInfants]] as const).map(([label, value, setter]) => <div key={label}><Label>{label}</Label><Input type="number" min={0} value={value} onChange={e => setter(Math.max(0, Number(e.target.value) || 0))}/></div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>أسعار الصرف إلى {currency} (تُحفظ مع العرض)</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">{currencies.map(c => <div key={c}><Label>1 {c} = {currency}</Label><Input type="number" min="0.000001" step="any" disabled={c === currency} value={c === currency ? 1 : rates[c]} onChange={e => setRates(prev => ({ ...prev, [c]: Number(e.target.value) }))}/></div>)}</CardContent></Card>
    {selectedPackage.types.includes('flight') && <Card><CardHeader><CardTitle>تسعير تذاكر الطيران حسب الفئة</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end"><div><Label>البالغ</Label><Input type="number" min={0} value={flightAdultFare} onChange={e => setFlightAdultFare(Number(e.target.value))}/></div><div><Label>الطفل</Label><Input type="number" min={0} value={flightChildFare} onChange={e => setFlightChildFare(Number(e.target.value))}/></div><div><Label>الرضيع</Label><Input type="number" min={0} value={flightInfantFare} onChange={e => setFlightInfantFare(Number(e.target.value))}/></div><Button variant="outline" onClick={addFlightFares}>إضافة أسعار الطيران كبند ({currency})</Button></CardContent></Card>}
    <Card><CardHeader><CardTitle>خدمات البرنامج</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="flex gap-2 flex-wrap">{([...selectedPackage.types, 'service'] as ServiceType[]).map(t => <Button key={t} variant="outline" size="sm" onClick={() => setLines(old => [...old, newLine(t)])}>+ {labels[t]}</Button>)}</div>
      {lines.map((line, i) => <div key={line.id} className="rounded-xl border p-4 space-y-3">
        <div className="flex justify-between items-center"><strong>{labels[line.type]} #{i + 1}</strong><Button size="sm" variant="ghost" onClick={() => setLines(old => old.filter(x => x.id !== line.id))}>حذف</Button></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><Label>الفندق / خط السير / الخدمة</Label><Input value={line.description} onChange={e => change(line.id, { description: e.target.value })} placeholder="مثال: فندق 5 ليالٍ، غرفة دبل، إفطار"/></div>
          <div><Label>العملة الأصلية</Label><Select value={line.currency} onValueChange={v => change(line.id, { currency: v as Currency })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>التكلفة للوحدة</Label><Input type="number" min={0} value={line.cost} onChange={e => change(line.id, { cost: Number(e.target.value) })}/></div>
          <div><Label>الكمية / الليالي / التذاكر</Label><Input type="number" min={1} value={line.quantity} onChange={e => change(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}/></div>
          <div><Label>طريقة الربح</Label><Select value={line.markupType} onValueChange={v => change(line.id, { markupType: v as Line['markupType'] })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percent">نسبة %</SelectItem><SelectItem value="fixed">مبلغ ثابت {currency}</SelectItem><SelectItem value="manual">سعر بيع إجمالي {currency}</SelectItem></SelectContent></Select></div>
          <div><Label>{line.markupType === 'percent' ? 'نسبة الربح %' : line.markupType === 'fixed' ? 'الربح الثابت' : 'سعر البيع الإجمالي'}</Label><Input type="number" min={0} value={line.markup} onChange={e => change(line.id, { markup: Number(e.target.value) })}/></div>
          <div className="sm:col-span-2"><Label>تفاصيل البرنامج (الفندق، نوع الغرفة، الوجبات، مواعيد الرحلات، الانتقالات)</Label><Input value={line.details} onChange={e => change(line.id, { details: e.target.value })}/></div>
          {line.type === 'hotel' && <div className="sm:col-span-3 grid sm:grid-cols-4 gap-3">{([['checkIn', 'تاريخ الدخول', 'date'], ['checkOut', 'تاريخ الخروج', 'date'], ['room', 'نوع الغرفة', 'text'], ['board', 'الوجبات', 'text']] as const).map(([key, label, type]) => <div key={key}><Label>{label}</Label><Input type={type} value={line.hotel?.[key] || ''} onChange={e => changeExtra(line, 'hotel', key, e.target.value)}/></div>)}</div>}
          {line.type === 'flight' && <div className="sm:col-span-3 grid sm:grid-cols-4 gap-3">{([['from', 'من'], ['to', 'إلى'], ['airline', 'شركة الطيران'], ['number', 'رقم الرحلة']] as const).map(([key, label]) => <div key={key}><Label>{label}</Label><Input value={line.flight?.[key] || ''} onChange={e => changeExtra(line, 'flight', key, e.target.value)}/></div>)}</div>}
          {line.type === 'transport' && <div className="sm:col-span-3 grid sm:grid-cols-3 gap-3">{([['pickup', 'نقطة الانطلاق'], ['dropoff', 'نقطة الوصول'], ['date', 'التاريخ']] as const).map(([key, label]) => <div key={key}><Label>{label}</Label><Input type={key === 'date' ? 'date' : 'text'} value={line.transport?.[key] || ''} onChange={e => changeExtra(line, 'transport', key, e.target.value)}/></div>)}</div>}
        </div><p className="text-sm text-muted-foreground">التكلفة: {amounts[i].base.toLocaleString()} {currency} | البيع: <strong>{amounts[i].sale.toLocaleString()} {currency}</strong></p>
      </div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>الملخص الداخلي</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-3 gap-3"><div>التكلفة: <b>{totalCost.toLocaleString()} {currency}</b></div><div>البيع: <b>{totalSale.toLocaleString()} {currency}</b></div><div>الربح: <b>{round(totalSale-totalCost).toLocaleString()} {currency}</b></div></CardContent></Card>
    {hasLoss && <p role="alert" className="text-destructive font-medium">تنبيه: يوجد بند سعر بيعه أقل من تكلفته. راجع هامش الربح قبل الحفظ.</p>}
    <div className="flex gap-3 flex-wrap"><Button disabled={!valid || createQuote.isPending} onClick={save}>حفظ عرض السعر كمسودة</Button><Select value={language} onValueChange={v => setLanguage(v as 'ar' | 'en')}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => { window.print(); }}>طباعة / PDF</Button></div>
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="bg-white text-slate-900 rounded-xl p-8 border print:border-0 print:p-0" id="customer-itinerary" aria-label="Customer-only itinerary preview">
      <h2 className="text-3xl font-bold tracking-wide">SAFAR</h2><p className="text-sm italic">Travel smarter. Manage better.</p><hr className="my-4"/>
      <h3 className="text-xl font-semibold">{language === 'ar' ? 'برنامج الرحلة وعرض السعر' : 'Travel Itinerary & Quotation'}</h3>
      <p>{language === 'ar' ? 'العميل' : 'Customer'}: {customer} | {language === 'ar' ? 'الوجهة' : 'Destination'}: {destination}</p>
      <p>{start} — {end} | {adults} Adults / {children} Children / {infants} Infants</p>
      <div className="mt-5 space-y-3">{lines.map((l, i) => <div key={l.id} className="border-b pb-2"><strong>{l.description || labels[l.type]}</strong><p className="text-sm whitespace-pre-wrap">{l.details}</p><p>{amounts[i].sale.toLocaleString()} {currency}</p></div>)}</div>
      <p className="text-xl font-bold mt-6">{language === 'ar' ? 'الإجمالي' : 'Total'}: {totalSale.toLocaleString()} {currency}</p><p className="text-xs mt-4">{language === 'ar' ? 'الأسعار والتوافر يخضعان للتأكيد وقت الحجز.' : 'Prices and availability are subject to confirmation at booking.'}</p>
    </section>
    <style>{`@media print { body * { visibility: hidden !important; } #customer-itinerary, #customer-itinerary * { visibility: visible !important; } #customer-itinerary { position: absolute; inset: 0; width: 100%; } }`}</style>
  </div>;
}
