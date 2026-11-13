import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBookingServices, type ServiceKind } from '@/hooks/useBookingServices';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import {
  amendmentCreditSplit, amendmentCustomerDelta, amendmentSupplierDelta,
  useTripServiceAmendments, type AmendmentRule, type AmendmentTerms, type ServiceAmendment, type ServiceSource,
} from '@/hooks/useTripServiceAmendments';

const labels: Record<AmendmentRule, string> = {
  nonrefundable: 'إلغاء غير مسترد', partial: 'إلغاء بغرامة واسترداد جزئي', full: 'إلغاء باسترداد كامل',
  free: 'تغيير تواريخ مجاني', repriced: 'تغيير بفرق سعر أو رسوم',
};
const serviceLabels: Record<ServiceKind, string> = { hotel: 'فندق', flight: 'طيران', transport: 'انتقالات', car: 'تأجير سيارة' };
const statuses = { pending: 'بانتظار الاعتماد', applied: 'تم تسجيل التنفيذ', rejected: 'مرفوض' };
const currencies = ['EGP', 'USD', 'SAR'];
const fmt = (value: number, currency: string) => `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
const message = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'تعذر تسجيل العملية';

type Target = {
  kind: ServiceKind; id: string; source: ServiceSource; title: string;
  tickets: string[]; dateFrom?: string; dateTo?: string; selling?: number; currency?: string;
};
type Detail = {
  id: string; hotel_name?: string; flight_number?: string; route?: string; car_type?: string; ticket_number?: string;
  check_in?: string; check_out?: string; departure_date?: string; arrival_date?: string; pickup_date?: string; dropoff_date?: string;
  selling_amount?: number;
};
type Props = {
  bookingId: string; currency: string; customerId?: string; currentUserId?: string; canReview: boolean;
  itinerary?: Partial<Record<ServiceKind, Detail>>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="grid gap-1.5 text-sm font-medium">{label}{children}</Label>;
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return <Field label={label}>
    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </Field>;
}

function MoneyField({ label, value, onChange, signed }: { label: string; value: string; onChange: (v: string) => void; signed?: boolean }) {
  return <Field label={label}><Input type="number" inputMode="decimal" min={signed ? undefined : 0}
    step="0.01" value={value} placeholder="0.00" onChange={e => onChange(e.target.value)} dir="ltr" /></Field>;
}

const moneyValue = (raw: string) => {
  if (raw === '') return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw) || Math.abs(Number(raw)) >= 1e12) return NaN;
  return Number(raw);
};

export function TripServiceAmendments({ bookingId, currency, customerId, currentUserId, canReview, itinerary }: Props) {
  const { hasPermission, getPermissionScope } = useSupabasePermissions();
  const canRead = hasPermission('financial_view') && getPermissionScope('financial_view') === 'organization'
    && getPermissionScope('bookings_view') === 'organization';
  const canWrite = hasPermission('bookings_edit') && getPermissionScope('bookings_edit') === 'organization';
  const canPost = hasPermission('payments_process') && getPermissionScope('payments_process') === 'organization';
  const linked = useBookingServices(canRead ? bookingId : undefined);
  const { list, documents, create, resolve } = useTripServiceAmendments(bookingId, canRead);
  const request = useRef<{ id: string; signature: string } | null>(null);
  const [targetKey, setTargetKey] = useState('');
  const [ticket, setTicket] = useState('');
  const [replacement, setReplacement] = useState('');
  const [rule, setRule] = useState<AmendmentRule>('free');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [policy, setPolicy] = useState('');
  const [value, setValue] = useState('');
  const [fee, setFee] = useState('');
  const [fare, setFare] = useState('');
  const [invoice, setInvoice] = useState('');
  const [supplierCurrency, setSupplierCurrency] = useState(currency);
  const [supplierFee, setSupplierFee] = useState('');
  const [supplierFare, setSupplierFare] = useState('');
  const [supplierWallet, setSupplierWallet] = useState('');
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [supplierFinance, setSupplierFinance] = useState('');
  const [review, setReview] = useState<{ id: string; approve: boolean } | null>(null);
  const [customerRef, setCustomerRef] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [note, setNote] = useState('');

  if (!canRead) return null;
  const targets: Target[] = (linked.data ?? []).map(s => ({
    ...s, source: 'linked', title: `${serviceLabels[s.kind]} · ${s.title} · ${s.reference}`, tickets: s.tickets ?? [],
  }));
  for (const [kind, d] of Object.entries(itinerary ?? {}) as [ServiceKind, Detail][]) {
    if (!d?.id) continue;
    targets.push({
      kind, id: d.id, source: 'detail', title: `${serviceLabels[kind]} · ${d.hotel_name || d.flight_number || d.route || d.car_type || 'تفاصيل الرحلة'}`,
      tickets: d.ticket_number ? [d.ticket_number] : [], dateFrom: d.check_in || d.departure_date || d.pickup_date,
      dateTo: d.check_out || d.arrival_date || d.dropoff_date, selling: d.selling_amount, currency,
    });
  }
  const targetId = (t: Target) => `${t.source}:${t.kind}:${t.id}`;
  const target = targets.find(t => targetId(t) === targetKey);
  const cancel = ['nonrefundable', 'partial', 'full'].includes(rule);
  const charged = rule === 'repriced';
  const customerDocs = documents.data?.customer.filter(i => (i.currency || 'EGP') === currency && (!customerId || i.customer_id === customerId)) ?? [];
  const supplierDocs = documents.data?.supplier.filter(i => i.currency === supplierCurrency) ?? [];
  const terms: AmendmentTerms = {
    operation: cancel ? 'cancel' : 'change', rule, policy: policy.trim(), customer_currency: currency,
    cancel_value: cancel ? moneyValue(value) : 0,
    customer_fee: rule === 'nonrefundable' ? moneyValue(value) : charged || rule === 'partial' ? moneyValue(fee) : 0,
    fare_delta: charged ? moneyValue(fare) : 0, customer_invoice_id: invoice || null,
    supplier_currency: supplierCurrency,
    supplier_fee: rule === 'free' ? 0 : moneyValue(supplierFee),
    supplier_fare_delta: rule === 'free' ? 0 : moneyValue(supplierFare),
    supplier_wallet: rule === 'free' ? 0 : moneyValue(supplierWallet),
    supplier_invoice_id: supplierInvoice || null, supplier_finance_ref: supplierFinance.trim() || null,
    start_date: cancel ? null : start || null, end_date: cancel ? null : end || null,
    new_ticket: !cancel && ticket ? replacement.trim() || null : null,
  };
  const delta = amendmentCustomerDelta(terms);
  const supplierDelta = amendmentSupplierDelta(terms);
  const chosenInvoice = customerDocs.find(i => i.id === invoice);
  const split = amendmentCreditSplit(delta, chosenInvoice?.remaining_amount ?? 0);
  const requiresSupplierDocument = terms.supplier_wallet > 0 || supplierDelta > 0;
  const requiresSupplierRef = (supplierDelta > 0 && supplierCurrency !== 'EGP') || -supplierDelta > terms.supplier_wallet;

  const selectTarget = (key: string) => {
    const next = targets.find(t => targetId(t) === key);
    setTargetKey(key); setTicket(''); setReplacement('');
    setStart(next?.dateFrom?.slice(0, 10) ?? ''); setEnd(next?.dateTo?.slice(0, 10) ?? '');
    setValue(next?.currency === currency && next.selling > 0 ? String(next.selling) : '');
  };
  const selectRule = (next: AmendmentRule) => { setRule(next); setFee(''); setFare(''); };

  const submit = async () => {
    if (!target || terms.policy.length < 3) return toast.error('اختر الخدمة واكتب شروط المورد');
    if (!currencies.includes(currency)) return toast.error('عملة الحجز غير مدعومة في هذا المسار');
    if (![terms.cancel_value, terms.customer_fee, terms.fare_delta, terms.supplier_fee, terms.supplier_fare_delta, terms.supplier_wallet].every(Number.isFinite)) {
      return toast.error('راجع القيم المالية. الحد الأقصى رقمين بعد العلامة العشرية');
    }
    if (delta !== 0 && !chosenInvoice) return toast.error('اختر فاتورة العميل المرتبطة بالتعديل');
    if (requiresSupplierDocument && !supplierDocs.some(i => i.id === supplierInvoice)) return toast.error('اختر فاتورة المورد');
    if (requiresSupplierRef && !terms.supplier_finance_ref) return toast.error('أدخل مرجع مستند تسوية المورد');
    const signature = JSON.stringify([targetKey, ticket, terms]);
    if (request.current?.signature !== signature) request.current = { id: crypto.randomUUID(), signature };
    try {
      await create.mutateAsync({ id: request.current.id, kind: target.kind, source: target.source, serviceId: target.id, ticket: ticket || null, terms });
      toast.success('تم إرسال الطلب للمراجعة');
      request.current = null;
      selectTarget(''); setPolicy(''); setFee(''); setFare(''); setInvoice(''); setSupplierFee('');
      setSupplierFare(''); setSupplierWallet(''); setSupplierInvoice(''); setSupplierFinance('');
    } catch (error) { toast.error(message(error)); }
  };

  const beginReview = (id: string, approve: boolean) => {
    setCustomerRef(''); setSupplierRef(''); setNote(''); setReview({ id, approve });
    void documents.refetch();
  };
  const finish = async (row: ServiceAmendment) => {
    if (!review) return;
    const rowDelta = amendmentCustomerDelta(row.terms);
    const liveInvoice = customerDocs.find(i => i.id === row.terms.customer_invoice_id);
    if (review.approve && rowDelta !== 0 && !liveInvoice) return toast.error('تعذر التحقق من الفاتورة. حدّث البيانات');
    try {
      await resolve.mutateAsync({
        id: row.id, approve: review.approve, customerReference: customerRef, supplierReference: supplierRef, note,
        expectedDue: rowDelta < 0 && liveInvoice ? amendmentCreditSplit(rowDelta, liveInvoice.remaining_amount ?? 0).due : null,
      });
      toast.success(review.approve ? 'تم تسجيل التنفيذ وتسويات الحجز' : 'تم رفض الطلب');
      setReview(null);
    } catch (error) { toast.error(message(error)); void documents.refetch(); }
  };

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> تعديل أو إلغاء خدمة وتسويتها</CardTitle>
      <p className="text-sm text-muted-foreground">سجّل شروط المورد، وراجع أثر التعديل على فاتورة العميل ومحفظة العميل والمورد قبل الاعتماد.</p>
    </CardHeader>
    <CardContent className="space-y-5">
      {linked.isError && <p className="text-sm text-destructive">تعذر تحميل الخدمات المرتبطة. <button className="underline" onClick={() => void linked.refetch()}>إعادة المحاولة</button></p>}
      {documents.isError && <p className="text-sm text-destructive">تعذر تحميل الفواتير. <button className="underline" onClick={() => void documents.refetch()}>إعادة المحاولة</button></p>}
      {canWrite && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="الخدمة" value={targetKey} onChange={selectTarget} placeholder={linked.isLoading ? 'جاري تحميل الخدمات' : targets.length ? 'اختر الخدمة' : 'لا توجد خدمات على الحجز'}
            options={targets.map(t => ({ value: targetId(t), label: t.title }))} />
          <SelectField label="العملية" value={rule} onChange={v => selectRule(v as AmendmentRule)}
            options={Object.entries(labels).map(([value, label]) => ({ value, label }))} />
          {!!target?.tickets.length && <SelectField label="نطاق الطيران" value={ticket} placeholder="كل الخدمة" options={target.tickets.map(t => ({ value: t, label: t }))}
            onChange={v => { setTicket(v); setReplacement(''); setValue(!v && target.currency === currency && target.selling > 0 ? String(target.selling) : ''); }} />}
          {cancel ? <MoneyField label={`قيمة الجزء الملغى (${currency})`} value={value} onChange={setValue} /> : <>
            <Field label="تاريخ البداية الجديد"><Input type="date" value={start} onChange={e => setStart(e.target.value)} required /></Field>
            <Field label="تاريخ النهاية الجديد"><Input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} required /></Field>
            {ticket && <Field label="رقم التذكرة البديلة (اختياري)"><Input value={replacement} maxLength={80} onChange={e => setReplacement(e.target.value)} dir="ltr" /></Field>}
          </>}
          {charged && <MoneyField label={`فرق السعر على العميل (${currency}، سالب عند الانخفاض)`} value={fare} onChange={setFare} signed />}
          {(charged || rule === 'partial') && <MoneyField label={`${cancel ? 'غرامة الإلغاء' : 'رسوم التغيير'} على العميل (${currency})`} value={fee} onChange={setFee} />}
          {Number.isFinite(delta) && delta !== 0 && <SelectField label="فاتورة العميل" value={invoice} onChange={setInvoice} placeholder="اختر الفاتورة المرتبطة"
            options={customerDocs.map(i => ({ value: i.id, label: `${i.invoice_number} · متبقي ${fmt(i.remaining_amount ?? 0, currency)}` }))} />}
        </div>
        <Field label="شروط المورد"><Textarea value={policy} onChange={e => setPolicy(e.target.value)} maxLength={2000} required placeholder="سياسة الإلغاء أو التغيير ومصدر عرض السعر" /></Field>
        {rule !== 'free' && <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">تكلفة وتسوية المورد</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SelectField label="عملة المورد" value={supplierCurrency} onChange={v => { setSupplierCurrency(v); setSupplierInvoice(''); }}
              options={currencies.map(c => ({ value: c, label: c }))} />
            <MoneyField label={cancel ? "غرامة المورد المخصومة من تكلفة الخدمة الأصلية" : "رسوم التغيير لدى المورد"} value={supplierFee} onChange={setSupplierFee} />
            <MoneyField label={cancel ? "إجمالي تخفيض تكلفة المورد (أدخل قيمة سالبة)" : "فرق تكلفة المورد (سالب عند الانخفاض)"} value={supplierFare} onChange={setSupplierFare} signed />
            <MoneyField label="المبلغ الذي سيعيده المورد من المدفوع" value={supplierWallet} onChange={setSupplierWallet} />
            {requiresSupplierDocument && <SelectField label="فاتورة المورد" value={supplierInvoice} onChange={setSupplierInvoice} placeholder="اختر فاتورة المورد"
              options={supplierDocs.map(i => ({ value: i.id, label: `${i.invoice_number} · مدفوع ${fmt(i.amount_paid, supplierCurrency)}` }))} />}
            {requiresSupplierRef && <Field label="مرجع تسوية حساب المورد لدى المالية"><Input value={supplierFinance} maxLength={500} onChange={e => setSupplierFinance(e.target.value)} /></Field>}
          </div>
        </details>}
        {target && Number.isFinite(delta) && <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-3 text-sm">
          <span>{delta > 0 ? `فرق يُفوتر للعميل ${fmt(delta, currency)}` : delta < 0 ? `إجمالي تخفيض العميل ${fmt(-delta, currency)}` : 'الفرق على العميل صفر'}</span>
          {delta < 0 && chosenInvoice && <>
            <Badge variant="outline">تخفيض المستحق {fmt(split.due, currency)}</Badge>
            <Badge variant="outline">محفظة العميل {fmt(split.wallet, currency)}</Badge>
          </>}
          {terms.supplier_wallet > 0 && <Badge variant="outline">محفظة المورد {fmt(terms.supplier_wallet, supplierCurrency)}</Badge>}
        </div>}
        <Button type="submit" disabled={!target || create.isPending}>إرسال للمراجعة</Button>
      </form>}

      {list.isError ? <p role="alert" className="text-sm text-destructive">تعذر تحميل سجل التعديلات. <button className="underline" onClick={() => void list.refetch()}>إعادة المحاولة</button></p> :
        list.isLoading ? <p className="text-sm text-muted-foreground">جاري تحميل التعديلات…</p> :
        (list.data ?? []).map(row => {
          const rowDelta = amendmentCustomerDelta(row.terms);
          const rowSupplierDelta = amendmentSupplierDelta(row.terms);
          const rowInvoice = customerDocs.find(i => i.id === row.terms.customer_invoice_id);
          const rowSplit = row.status === 'applied'
            ? { due: Number(row.customer_due_reduction), wallet: amendmentCreditSplit(rowDelta, Number(row.customer_due_reduction)).wallet }
            : amendmentCreditSplit(rowDelta, rowInvoice?.remaining_amount ?? 0);
          const mayResolve = canReview && getPermissionScope('bookings_confirm') === 'organization' && row.requested_by !== currentUserId && row.status === 'pending';
          const financial = rowDelta !== 0 || rowSupplierDelta !== 0 || row.terms.supplier_wallet > 0;
          const supplierParty = documents.data?.supplier.find(i => i.id === row.terms.supplier_invoice_id)?.supplier_id;
          const title = targets.find(t => targetId(t) === `${row.service_source}:${row.service_kind}:${row.service_id}`)?.title ?? serviceLabels[row.service_kind];
          return <div key={row.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <strong className="text-sm">{labels[row.terms.rule]} · {title}{row.ticket_number && ` · تذكرة ${row.ticket_number}`}</strong>
              <Badge variant="secondary">{statuses[row.status]}</Badge>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground" data-no-translate>{row.terms.policy}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {rowDelta > 0 && <span>فرق يُفوتر للعميل {fmt(rowDelta, currency)}</span>}
              {row.terms.start_date && <span>التواريخ {row.terms.start_date} إلى {row.terms.end_date}</span>}
              {row.terms.new_ticket && <span>التذكرة البديلة {row.terms.new_ticket}</span>}
              {row.terms.customer_fee > 0 && <span>غرامة العميل {fmt(row.terms.customer_fee, currency)}</span>}
              {row.terms.fare_delta !== 0 && <span>فرق السعر {fmt(row.terms.fare_delta, currency)}</span>}
              {row.terms.supplier_fee > 0 && <span>غرامة المورد {fmt(row.terms.supplier_fee, row.terms.supplier_currency)}</span>}
              {row.terms.supplier_fare_delta !== 0 && <span>فرق تكلفة المورد {fmt(row.terms.supplier_fare_delta, row.terms.supplier_currency)}</span>}
              {rowDelta < 0 && (rowInvoice || row.status === 'applied') && row.status !== 'rejected' && <>
                <span>تخفيض المستحق {fmt(rowSplit.due, currency)}</span>
                <span>محفظة العميل {fmt(rowSplit.wallet, currency)}</span>
              </>}
              {row.terms.supplier_wallet > 0 && <span>محفظة المورد {fmt(row.terms.supplier_wallet, row.terms.supplier_currency)}</span>}
              {row.terms.supplier_finance_ref && <span>مرجع تسوية المورد {row.terms.supplier_finance_ref}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {row.customer_refund_id && <Link className="underline" to={`/refund-balances?kind=customer${customerId ? `&party=${customerId}` : ''}`}>فتح محفظة العميل</Link>}
              {row.supplier_claim_id && <Link className="underline" to={`/refund-balances?kind=supplier${supplierParty ? `&party=${supplierParty}` : ''}`}>فتح محفظة المورد</Link>}
              {row.additional_invoice_id && <Link className="underline" to={`/invoices?id=${row.additional_invoice_id}`}>فاتورة فرق السعر</Link>}
              {row.supplier_order_id && <Link className="underline" to="/payment-orders">أمر دفع المورد</Link>}
            </div>
            {row.decision && <p className="break-words text-sm text-muted-foreground">
              {row.decision.customer_reference && <span>موافقة العميل {row.decision.customer_reference} · </span>}
              {row.decision.supplier_reference && <span>تأكيد المورد {row.decision.supplier_reference} · </span>}
              {row.decision.note}
            </p>}
            {mayResolve && review?.id !== row.id && <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={financial && !canPost} onClick={() => beginReview(row.id, true)}>مراجعة واعتماد</Button>
              <Button size="sm" variant="outline" onClick={() => beginReview(row.id, false)}>رفض الطلب</Button>
            </div>}
            {mayResolve && review?.id === row.id && <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void finish(row); }}>
              {review.approve && <>
                <Field label="مرجع موافقة العميل"><Input value={customerRef} onChange={e => setCustomerRef(e.target.value)} maxLength={500} required /></Field>
                <Field label="مرجع تأكيد تنفيذ المورد"><Input value={supplierRef} onChange={e => setSupplierRef(e.target.value)} maxLength={500} required /></Field>
              </>}
              <div className="sm:col-span-2"><Field label={review.approve ? 'ملاحظة (اختياري)' : 'سبب الرفض'}>
                <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} minLength={review.approve ? undefined : 3} required={!review.approve} />
              </Field></div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button size="sm" type="submit" disabled={resolve.isPending || (review.approve && financial && documents.isFetching)}>
                  {review.approve ? 'اعتماد وتسجيل التنفيذ' : 'تأكيد الرفض'}
                </Button>
                <Button size="sm" type="button" variant="outline" onClick={() => setReview(null)} disabled={resolve.isPending}>رجوع</Button>
              </div>
            </form>}
          </div>;
        })}
    </CardContent>
  </Card>;
}
