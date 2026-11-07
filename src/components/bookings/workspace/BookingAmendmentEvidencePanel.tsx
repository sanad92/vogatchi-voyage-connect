import { useMemo, useState } from 'react';
import { AlertTriangle, FileCheck2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { useBookingFinancials } from '@/hooks/useBookingFinancials';
import { assessEvidenceReconciliation } from '@/lib/tripFile/evidenceReconciliation';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import {
  useBookingChangeSourceEvidence,
  useLinkBookingChangeSourceEvidence,
  type SourceEvidenceType,
  type BookingSourceEvidence,
} from '@/hooks/useBookingChangeSourceEvidence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const TYPES: Record<SourceEvidenceType, string> = {
  customer_invoice: 'فاتورة العميل',
  supplier_invoice: 'فاتورة المورد',
  customer_payment: 'تحصيل العميل',
  supplier_payment: 'مدفوعات المورد',
  generated_document: 'مستند مولّد',
};
interface Option {
  type: SourceEvidenceType;
  id: string;
  label: string;
  currency: string | null;
  amount: number | null;
  status: string | null;
}
const fmtAmount = (amount: number | null, ccy: string | null) =>
  amount == null ? '—' : `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${ccy || 'بدون عملة'}`;
const isVoided = (status: string | null | undefined) =>
  ['cancelled','canceled','void','rejected','reversed','failed']
    .includes(String(status ?? '').toLowerCase());

/**
 * Optional, immutable attachment of actual existing financial/document rows
 * to a reviewed amendment. It does NOT create a payment or prove refund.
 *
 * This component is rendered only after parent financial-view authorization.
 * The SQL RPC independently validates active user, org, booking and source.
 */
export function BookingAmendmentEvidencePanel({
  bookingId,
  approvedRequests,
}: {
  bookingId: string;
  approvedRequests: BookingChangeRequest[];
}) {
  const orgId = useOrgId();
  const { data: financials, isLoading: loadingFinancials, isError: financialError,
    error: financialReason, refetch: refreshFinancials } = useBookingFinancials(bookingId);
  const evidence = useBookingChangeSourceEvidence(bookingId, true);
  const link = useLinkBookingChangeSourceEvidence(bookingId);
  const [requestId, setRequestId] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  const options = useMemo(() => {
    if (!financials || !orgId) return [];
    const candidates: Option[] = [];
    const add = (type: SourceEvidenceType, item: {
      id: string; booking_id: string | null; organization_id: string | null;
      currency?: string | null; status?: string | null;
    }, label: string, amount: number | null | undefined) => {
      if (item.booking_id !== bookingId || item.organization_id !== orgId
          || isVoided(item.status)) return;
      candidates.push({
        type, id: item.id, label,
        currency: item.currency || null,
        status: item.status || null,
        amount: amount == null ? null : Number(amount),
      });
    };
    financials.invoices.forEach(i => add(
      'customer_invoice', i,
      `فاتورة عميل: ${i.invoice_number || i.id.slice(0,8)}`, i.final_amount,
    ));
    financials.supplierInvoices.forEach(i => add(
      'supplier_invoice', i,
      `فاتورة مورد: ${i.invoice_number || i.id.slice(0,8)}`, i.amount,
    ));
    financials.customerPayments.forEach(p => add(
      'customer_payment', p,
      `تحصيل عميل: ${p.reference_number || p.id.slice(0,8)}`, p.amount,
    ));
    financials.supplierPayments.forEach(p => add(
      'supplier_payment', p,
      `دفعة مورد: ${p.reference_number || p.payment_reference || p.id.slice(0,8)}`, p.amount,
    ));
    financials.documents.forEach(d => add(
      'generated_document', d,
      `مستند: ${d.document_number || d.id.slice(0,8)}`, d.total_amount,
    ));
    return candidates;
  }, [financials, orgId, bookingId]);

  const selected = options.find(o => `${o.type}|${o.id}` === documentKey);
  const currentEvidenceMessage = (item: BookingSourceEvidence) => {
    const current = options.find(o => o.type === item.source_type && o.id === item.source_id);
    const comparison = assessEvidenceReconciliation(item, current ? {
      status: current.type === 'generated_document' ? 'document_record' : current.status,
      currency: current.currency,
      amount: current.amount,
    } : undefined);
    if (comparison === 'not_in_current_records') {
      return 'تنبيه: المستند مش ظاهر ضمن سجلات الحجز المحمّلة حاليًا. راجع حالة المستند الأصلي.';
    }
    if (comparison === 'details_changed') {
      return 'تنبيه: حالة أو عملة أو قيمة المستند تغيّرت مقارنة بوقت ربطه. راجع السجل الأصلي.';
    }
    return 'القيم المعروضة مطابقة لوقت الربط؛ ده مش إثبات تسوية مالية.';
  };


  const submit = () => {
    const current = approvedRequests.find(r => r.id === requestId);
    if (!current || !selected) {
      toast.error('اختار طلب التعديل والمستند المرتبطين بنفس الحجز');
      return;
    }
    link.mutate({
      requestId: current.id,
      sourceType: selected.type,
      sourceId: selected.id,
    }, {
      onSuccess: ({ replayed }) => {
        toast.success(replayed ? 'المستند كان مربوط بالطلب بالفعل' : 'تم تسجيل رابط المستند في سجل التعديل');
        setDocumentKey('');
      },
      onError: (error: Error) => toast.error(error.message || 'تعذر ربط المستند'),
    });
  };

  const linked = evidence.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" /> ربط التعديل بمستندات الحجز الفعلية
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            اربط طلب التعديل بسجل موجود فعلًا في فواتير العميل أو المورد أو المدفوعات أو المستندات.
            النظام بيتأكد إن المستند لنفس الشركة والحجز قبل تسجيل الرابط.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={evidence.isFetching || loadingFinancials}
          onClick={() => { void evidence.refetch(); void refreshFinancials(); }}>
          <RefreshCw className="h-4 w-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingFinancials || evidence.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل مستندات الحجز والروابط…</p>
        ) : financialError || evidence.isError ? (
          <p role="alert" className="text-sm text-destructive flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            تعذر تحميل مستندات الحجز: {(financialReason as Error)?.message
              || (evidence.error as Error)?.message || 'الخدمة غير متاحة'}
          </p>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium">طلب التعديل المعتمد</p>
                <Select value={requestId} onValueChange={v => { setRequestId(v); setDocumentKey(''); }}>
                  <SelectTrigger><SelectValue placeholder="اختر طلب تعديل" /></SelectTrigger>
                  <SelectContent>
                    {approvedRequests.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.description.slice(0, 65)}{r.description.length > 65 ? '…' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">مستند من السجلات الحالية</p>
                <Select value={documentKey} onValueChange={setDocumentKey}>
                  <SelectTrigger><SelectValue placeholder="اختر مستندًا تابعًا للحجز" /></SelectTrigger>
                  <SelectContent>
                    {options.map(o => (
                      <SelectItem key={`${o.type}|${o.id}`} value={`${o.type}|${o.id}`}>
                        {o.label} — {fmtAmount(o.amount,o.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selected && (
              <p className="text-xs text-muted-foreground">
                حالة المستند الآن: {selected.status || 'لا توجد حالة مالية للمستند'}.
                الربط مش إثبات لتحصيل أو سداد أو استرداد فعلي.
              </p>
            )}
            {!options.length && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                مفيش مستندات مالية صالحة للربط على الحجز حاليًا. لازم تتسجل من الوحدة المختصة أولًا.
              </p>
            )}
            <Button disabled={link.isPending || !selected || !requestId} onClick={submit}>
              <FileCheck2 className="h-4 w-4 ml-1" />
              {link.isPending ? 'جاري التسجيل…' : 'ربط المستند بطلب التعديل'}
            </Button>

            <div className="space-y-2 pt-2">
              <p className="text-sm font-semibold">سجل المستندات المرتبطة ({linked.length} رابط معروض)</p>
              {!linked.length && <p className="text-xs text-muted-foreground">لا يوجد مستند مرتبط بالتعديلات حتى الآن.</p>}
              {linked.map(item => (
                <div key={item.id} className="border rounded-md p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{TYPES[item.source_type] || item.source_type}</Badge>
                    <span className="font-medium">{item.reference_at_link || item.source_id.slice(0,8)}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.linked_at ? new Date(item.linked_at).toLocaleString('ar-EG') : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    القيمة وقت الربط: {fmtAmount(item.amount_at_link,item.currency_at_link)}
                    {' · '}الحالة وقت الربط: {item.status_at_link || 'غير محددة'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">{currentEvidenceMessage(item)}</p>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 inline ml-1" />
          وجود مستند أو حالة «مدفوع» وقت الربط مش دليل على أن التعديل أو الاسترداد اكتمل.
          الحالة المالية ممكن تتغير بعد الربط؛ راجع وحدة المالية والمورد قبل اتخاذ قرار.
        </p>
      </CardContent>
    </Card>
  );
}
