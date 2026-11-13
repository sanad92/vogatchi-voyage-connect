import type { SourceEvidenceType } from '@/hooks/useBookingChangeSourceEvidence';
import { assessEvidenceReconciliation } from './evidenceReconciliation';

export interface FinanceSourceRow {
  id: string;
  organization_id: string | null;
  booking_id: string | null;
  currency: string | null;
  status: string | null;
  amount: number | null;
  recordedPaid?: number | null;
}
export interface CustomerAllocationRow {
  id: string;
  organization_id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
}
export interface SupplierAllocationRow {
  id: string;
  organization_id: string;
  supplier_payment_id: string;
  supplier_invoice_id: string | null;
  amount: number;
}
export interface LinkedEvidence {
  id: string;
  source_type: SourceEvidenceType;
  source_id: string;
  status_at_link: string | null;
  currency_at_link: string | null;
  amount_at_link: number | null;
  change_request_id: string;
}
export type EvidenceAllocationState =
  | 'source_not_visible'
  | 'void_or_reversed'
  | 'data_incomplete'
  | 'allocation_conflict'
  | 'over_allocated'
  | 'no_matching_allocation'
  | 'partially_allocated'
  | 'allocated_in_records'
  | 'not_a_payment_document';

export interface EvidenceReviewLine {
  evidenceId: string;
  requestId: string;
  type: SourceEvidenceType;
  sourceId: string;
  state: EvidenceAllocationState;
  changedSinceLink: boolean;
  amount: number | null;
  currency: string | null;
  allocated: number | null;
  recordedPaid: number | null;
  inconsistencies: string[];
}

export interface AllocationReviewInput {
  orgId: string;
  bookingId: string;
  links: LinkedEvidence[];
  customerInvoices: FinanceSourceRow[];
  supplierInvoices: FinanceSourceRow[];
  customerPayments: FinanceSourceRow[];
  supplierPayments: FinanceSourceRow[];
  generatedDocuments: FinanceSourceRow[];
  customerAllocations: CustomerAllocationRow[];
  supplierAllocations: SupplierAllocationRow[];
  incompleteData?: boolean;
}
const norm = (text: string | null | undefined) => String(text || '').trim().toLowerCase();
const normalizedCurrency = (currency: string | null | undefined) => String(currency || '').trim().toUpperCase();
const isVoid = (status: string | null) =>
  ['cancelled', 'canceled', 'void', 'rejected', 'reversed', 'failed', 'refunded', 'chargeback'].includes(norm(status));
const paymentCompleted = (status: string | null) =>
  ['paid', 'completed', 'succeeded'].includes(norm(status));
const CENT = 0.01;
const sameCurrency = (a: string | null, b: string | null) =>
  !!normalizedCurrency(a) && normalizedCurrency(a) === normalizedCurrency(b);

function validMoney(amount: number | null | undefined): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0;
}

/**
 * Conservative source-by-source reconciliation. Never concludes a bank
 * transfer/refund is settled from an allocation alone. In particular,
 * existing legacy invoice paid fields are compared but never automatically
 * added to allocations, to avoid double counting.
 */
export function reviewBookingEvidenceAllocations(input: AllocationReviewInput): EvidenceReviewLine[] {
  const sources: Record<SourceEvidenceType, Map<string, FinanceSourceRow>> = {
    customer_invoice: new Map(input.customerInvoices.map(x => [x.id, x])),
    supplier_invoice: new Map(input.supplierInvoices.map(x => [x.id, x])),
    customer_payment: new Map(input.customerPayments.map(x => [x.id, x])),
    supplier_payment: new Map(input.supplierPayments.map(x => [x.id, x])),
    generated_document: new Map(input.generatedDocuments.map(x => [x.id, x])),
  };
  const anySource = (type: SourceEvidenceType, id: string): FinanceSourceRow | undefined => {
    const row = sources[type].get(id);
    return row?.organization_id === input.orgId && row.booking_id === input.bookingId
      ? row : undefined;
  };

  return input.links.map(link => {
    const source = anySource(link.source_type, link.source_id);
    const result: EvidenceReviewLine = {
      evidenceId: link.id,
      requestId: link.change_request_id,
      type: link.source_type,
      sourceId: link.source_id,
      state: 'data_incomplete',
      changedSinceLink: false,
      amount: source?.amount ?? null,
      currency: source?.currency ?? null,
      recordedPaid: source?.recordedPaid ?? null,
      allocated: null,
      inconsistencies: [],
    };

    if (!source) {
      result.state = 'source_not_visible';
      result.inconsistencies.push('المستند الأصلي غير ظاهر في السجلات المقروءة لهذا الحجز');
      return result;
    }
    result.changedSinceLink = assessEvidenceReconciliation(link, {
      status: link.source_type === 'generated_document' ? 'document_record' : source.status,
      currency: source.currency,
      amount: source.amount,
    }) !== 'details_match';

    if (isVoid(source.status)) {
      result.state = 'void_or_reversed';
      result.inconsistencies.push('الحالة الحالية للمصدر تشير إلى إلغاء أو عكس العملية');
      return result;
    }
    if (input.incompleteData) {
      result.state = 'data_incomplete';
      result.inconsistencies.push('قراءة سجلات التخصيص غير مكتملة؛ لا يمكن تقرير التغطية');
      return result;
    }
    if (link.source_type === 'generated_document') {
      result.state = 'not_a_payment_document';
      return result;
    }

    if (!validMoney(source.amount) || !normalizedCurrency(source.currency)) {
      result.state = 'data_incomplete';
      result.inconsistencies.push('المبلغ أو العملة غير صالحين للحساب');
      return result;
    }
    const incoming: { amount: number; valid: boolean }[] = [];
    const addCustomer = (a: CustomerAllocationRow, invoiceId: string, paymentId: string) => {
      const invoice = anySource('customer_invoice', invoiceId);
      const payment = anySource('customer_payment', paymentId);
      const good = a.organization_id === input.orgId
        && !!invoice && !!payment
        && !isVoid(invoice.status) && paymentCompleted(payment.status)
        && sameCurrency(invoice.currency, payment.currency)
        && sameCurrency(source.currency, invoice.currency)
        && validMoney(a.amount) && a.amount > 0;
      incoming.push({ amount: a.amount, valid: good });
    };
    const addSupplier = (a: SupplierAllocationRow, invoiceId: string | null, paymentId: string) => {
      const invoice = invoiceId ? anySource('supplier_invoice', invoiceId) : undefined;
      const payment = anySource('supplier_payment', paymentId);
      const good = a.organization_id === input.orgId
        && !!invoice && !!payment
        && !isVoid(invoice.status) && paymentCompleted(payment.status)
        && sameCurrency(invoice.currency, payment.currency)
        && sameCurrency(source.currency, invoice.currency)
        && validMoney(a.amount) && a.amount > 0;
      incoming.push({ amount: a.amount, valid: good });
    };

    if (link.source_type === 'customer_invoice') {
      input.customerAllocations
        .filter(a => a.invoice_id === link.source_id)
        .forEach(a => addCustomer(a, a.invoice_id, a.payment_id));
    } else if (link.source_type === 'customer_payment') {
      input.customerAllocations
        .filter(a => a.payment_id === link.source_id)
        .forEach(a => addCustomer(a, a.invoice_id, a.payment_id));
    } else if (link.source_type === 'supplier_invoice') {
      input.supplierAllocations
        .filter(a => a.supplier_invoice_id === link.source_id)
        .forEach(a => addSupplier(a, a.supplier_invoice_id, a.supplier_payment_id));
    } else {
      input.supplierAllocations
        .filter(a => a.supplier_payment_id === link.source_id)
        .forEach(a => addSupplier(a, a.supplier_invoice_id, a.supplier_payment_id));
    }

    if (incoming.some(a => !a.valid)) {
      result.state = 'allocation_conflict';
      result.inconsistencies.push('فيه تخصيص مرتبط بسجل خارج الحجز، أو عملة مختلفة، أو دفعة غير مكتملة');
      return result;
    }
    if (['customer_payment','supplier_payment'].includes(link.source_type)
        && !paymentCompleted(source.status)) {
      result.state = 'data_incomplete';
      result.inconsistencies.push('حالة الدفع لا تؤكد اكتمال التسجيل المحاسبي');
      return result;
    }
    const allocated = incoming.reduce((sum, a) => sum + a.amount, 0);
    result.allocated = Math.round(allocated * 100) / 100;
    if (allocated > source.amount + CENT) {
      result.state = 'over_allocated';
      result.inconsistencies.push('إجمالي التخصيص أكبر من قيمة المستند');
    } else if (!incoming.length) {
      result.state = 'no_matching_allocation';
      result.inconsistencies.push('لا توجد تخصيصات مطابقة؛ قد تكون هناك قيود تاريخية تحتاج فحصًا');
    } else if (allocated + CENT < source.amount) {
      result.state = 'partially_allocated';
    } else {
      result.state = 'allocated_in_records';
    }
    if (source.recordedPaid !== null && source.recordedPaid !== undefined
      && Number.isFinite(source.recordedPaid)
      && Math.abs(source.recordedPaid - allocated) > CENT) {
      result.inconsistencies.push('حقل المسدد الموجود في الفاتورة يختلف عن إجمالي التخصيصات');
    }
    // Even fully allocated links must not be labelled settled or refunded.
    return result;
  });
}
