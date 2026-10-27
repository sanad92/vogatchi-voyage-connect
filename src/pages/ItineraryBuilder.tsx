import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, type QuoteItem } from '@/hooks/useQuotes';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Currency = 'EGP' | 'SAR' | 'USD' | 'EUR' | 'AED';
type ServiceType = 'hotel' | 'flight' | 'transport' | 'service';
type Line = { id: string; type: ServiceType; description: string; currency: Currency; cost: number; quantity: number; markupType: 'percent' | 'fixed' | 'manual'; markup: number; details: string };
const currencies: Currency[] = ['EGP', 'SAR', 'USD', 'EUR', 'AED'];
const labels: Record<ServiceType, string> = { hotel: 'فندق وغرف', flight: 'طيران', transport: 'انتقالات', service: 'خدمة أخرى' };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const newLine = (type: ServiceType): Line => ({ id: crypto.randomUUID(), type, description: '', currency: 'EGP', cost: 0, quantity: 1, markupType: 'percent', markup: 15, details: '' });
export default function ItineraryBuilder() {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createQuote } = useQuotes();
  const [customer, setCustomer] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [currency, setCurrency] = useState<Currency>('EGP');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [rates, setRates] = useState<Record<Currency, number>>({ EGP: 1, SAR: 1, USD: 1, EUR: 1, AED: 1 });
  const [lines, setLines] = useState<Line[]>([newLine('hotel')]);
  const [flightAdultFare, setFlightAdultFare] = useState(0);
  const [flightChildFare, setFlightChildFare] = useState(0);
  const [flightInfantFare, setFlightInfantFare] = useState(0);
  const change = (id: string, patch: Partial<Line>) => setLines(old => old.map(line => line.id === id ? { ...line, ...patch } : line));
  const amounts = useMemo(() => lines.map(line => {
    const base = round(line.cost * line.quantity * (line.currency === currency ? 1 : rates[line.currency]));
    const sale = line.markupType === 'manual' ? round(line.markup) : line.markupType === 'fixed' ? round(base + line.markup) : round(base * (1 + line.markup / 100));
    return { base, sale };
  }), [lines, rates, currency]);
  const totalCost = round(amounts.reduce((sum, x) => sum + x.base, 0));
  const totalSale = round(amounts.reduce((sum, x) => sum + x.sale, 0));
  const valid = !!orgId && !!customer.trim() && !!destination.trim() && adults + children + infants > 0 && (!start || !end || end >= start) && lines.length > 0 && lines.every((l, i) => l.description.trim() && Number.isInteger(l.quantity) && l.quantity > 0 && Number.isFinite(l.cost) && l.cost >= 0 && Number.isFinite(l.markup) && l.markup >= 0 && Number.isFinite(rates[l.currency]) && rates[l.currency] > 0 && Number.isFinite(amounts[i].base) && Number.isFinite(amounts[i].sale));
  const addFlightFares = () => {
    const cost = round(flightAdultFare * adults + flightChildFare * children + flightInfantFare * infants);
    if (cost <= 0) return toast.error('أدخل أسعار تذاكر الطيران أولاً');
    setLines(old => [...old, { ...newLine('flight'), description: 'تذاكر طيران للمسافرين', cost, quantity: 1, details: JSON.stringify({ adult_fare: flightAdultFare, child_fare: flightChildFare, infant_fare: flightInfantFare, adults, children, infants }) }]);
  };
  const save = async () => {
    if (!valid) return toast.error('راجع العميل والوجهة والبنود وأسعار الصرف');
    const items: QuoteItem[] = lines.map((line, i) => ({
      item_type: line.type, description: line.description, cost_price: amounts[i].base / line.quantity,
      selling_price: amounts[i].sale / line.quantity, quantity: line.quantity,
      total_cost: amounts[i].base, total_selling: amounts[i].sale, sort_order: i,
      details: { itinerary_builder: true, service_details: line.details, source_currency: line.currency,
        source_cost: line.cost, exchange_rate: line.currency === currency ? 1 : rates[line.currency],
        quote_currency: currency, markup_type: line.markupType, markup_value: line.markup,
        travelers: { adults, children, infants }, fx_snapshot: rates }
    }));
    try {
      await createQuote.mutateAsync({
        customer_id: null, customer_name: customer.trim(), destination: destination.trim(),
        travel_date: start || null, return_date: end || null, number_of_travelers: adults + children + infants,
        notes: 'Itinerary Builder | Currency: ' + currency + ' | Adults: ' + adults + ' | Children: ' + children + ' | Infants: ' + infants,
        discount_amount: 0, vat_rate: 0, valid_until: null, assigned_employee_id: null, status: 'draft', items
      });
      navigate('/quotes');
    } catch { /* Existing mutation displays the error toast. */ }
  };
  return <div dir="rtl" className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
    <div className="flex items-center justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-bold">Vogatchi Itinerary Builder</h1><p className="text-muted-foreground">منشئ البرامج السياحية وعروض الأسعار</p></div><Button variant="outline" onClick={() => navigate('/quotes')}>عروض الأسعار</Button></div>
    <Card><CardHeader><CardTitle>بيانات الرحلة والمسافرين</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-3 gap-4">
      <div><Label>اسم العميل</Label><Input value={customer} onChange={e => setCustomer(e.target.value)}/></div>
      <div><Label>الوجهة</Label><Input value={destination} onChange={e => setDestination(e.target.value)}/></div>
      <div><Label>عملة البيع</Label><Select value={currency} onValueChange={v => setCurrency(v as Currency)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>المغادرة</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)}/></div><div><Label>العودة</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)}/></div>
      {([['بالغين', adults, setAdults], ['أطفال', children, setChildren], ['رضع', infants, setInfants]] as const).map(([label, value, setter]) => <div key={label}><Label>{label}</Label><Input type="number" min={0} value={value} onChange={e => setter(Math.max(0, Number(e.target.value) || 0))}/></div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>أسعار الصرف إلى {currency} (تُحفظ مع العرض)</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">{currencies.map(c => <div key={c}><Label>1 {c} = {currency}</Label><Input type="number" min="0.000001" step="any" disabled={c === currency} value={c === currency ? 1 : rates[c]} onChange={e => setRates(prev => ({ ...prev, [c]: Number(e.target.value) }))}/></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>تسعير تذاكر الطيران حسب الفئة</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end"><div><Label>البالغ</Label><Input type="number" min={0} value={flightAdultFare} onChange={e => setFlightAdultFare(Number(e.target.value))}/></div><div><Label>الطفل</Label><Input type="number" min={0} value={flightChildFare} onChange={e => setFlightChildFare(Number(e.target.value))}/></div><div><Label>الرضيع</Label><Input type="number" min={0} value={flightInfantFare} onChange={e => setFlightInfantFare(Number(e.target.value))}/></div><Button variant="outline" onClick={addFlightFares}>إضافة أسعار الطيران كبند ({currency})</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>خدمات البرنامج</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="flex gap-2 flex-wrap">{(Object.keys(labels) as ServiceType[]).map(t => <Button key={t} variant="outline" size="sm" onClick={() => setLines(old => [...old, newLine(t)])}>+ {labels[t]}</Button>)}</div>
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
        </div><p className="text-sm text-muted-foreground">التكلفة: {amounts[i].base.toLocaleString()} {currency} | البيع: <strong>{amounts[i].sale.toLocaleString()} {currency}</strong></p>
      </div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>الملخص الداخلي</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-3 gap-3"><div>التكلفة: <b>{totalCost.toLocaleString()} {currency}</b></div><div>البيع: <b>{totalSale.toLocaleString()} {currency}</b></div><div>الربح: <b>{round(totalSale-totalCost).toLocaleString()} {currency}</b></div></CardContent></Card>
    <div className="flex gap-3 flex-wrap"><Button disabled={!valid || createQuote.isPending} onClick={save}>حفظ عرض السعر كمسودة</Button><Select value={language} onValueChange={v => setLanguage(v as 'ar' | 'en')}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => { window.print(); }}>طباعة / PDF</Button></div>
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="bg-white text-slate-900 rounded-xl p-8 border print:border-0 print:p-0" id="customer-itinerary" aria-label="Customer-only itinerary preview">
      <h2 className="text-3xl font-bold tracking-wide">VOGATCHI</h2><p className="text-sm italic">Come to see world with us</p><hr className="my-4"/>
      <h3 className="text-xl font-semibold">{language === 'ar' ? 'برنامج الرحلة وعرض السعر' : 'Travel Itinerary & Quotation'}</h3>
      <p>{language === 'ar' ? 'العميل' : 'Customer'}: {customer} | {language === 'ar' ? 'الوجهة' : 'Destination'}: {destination}</p>
      <p>{start} — {end} | {adults} Adults / {children} Children / {infants} Infants</p>
      <div className="mt-5 space-y-3">{lines.map((l, i) => <div key={l.id} className="border-b pb-2"><strong>{l.description || labels[l.type]}</strong><p className="text-sm whitespace-pre-wrap">{l.details}</p><p>{amounts[i].sale.toLocaleString()} {currency}</p></div>)}</div>
      <p className="text-xl font-bold mt-6">{language === 'ar' ? 'الإجمالي' : 'Total'}: {totalSale.toLocaleString()} {currency}</p><p className="text-xs mt-4">{language === 'ar' ? 'الأسعار والتوافر يخضعان للتأكيد وقت الحجز.' : 'Prices and availability are subject to confirmation at booking.'}</p>
    </section>
    <style>{`@media print { body * { visibility: hidden !important; } #customer-itinerary, #customer-itinerary * { visibility: visible !important; } #customer-itinerary { position: absolute; inset: 0; width: 100%; } }`}</style>
  </div>;
}
