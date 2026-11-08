import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import type { BookingSourceEvidence } from '@/hooks/useBookingChangeSourceEvidence';
import type { EvidenceReviewLine } from './allocationReview';

export type ExceptionSeverity = 'block' | 'review';
export type ExceptionCode =
  | 'source_data_unavailable' | 'tenant_mismatch' | 'booking_cancelled'
  | 'request_not_approved' | 'handoff_missing' | 'handoff_blocked'
  | 'supplier_reference_missing' | 'finance_review_missing'
  | 'independent_review_missing' | 'operations_attestation_missing'
  | 'financial_impact_unassessed' | 'currency_missing'
  | 'customer_document_missing' | 'supplier_document_missing'
  | 'source_document_changed' | 'source_document_invalid'
  | 'source_allocation_unverified' | 'evidence_tenant_mismatch'
  | 'financial_documents_truncated';

export interface ExecutionException {
  code: ExceptionCode;
  severity: ExceptionSeverity;
  detail: string;
}

export interface ExecutionReviewInput {
  organizationId: string;
  bookingId: string;
  bookingStatus: string | null | undefined;
  workflowStage?: string | null;
  requests: BookingChangeRequest[];
  handoffs: BookingChangeHandoff[];
  evidence: BookingSourceEvidence[];
  allocations: EvidenceReviewLine[];
  // Only pass "complete" when every relevant source query succeeded, all
  // result sets are present and no pagination/truncation is suspected.
  dataComplete: boolean;
}

export interface ExecutionReviewResult {
  requestId: string;
  // NEVER "approved for execution". The source documents and handoffs are
  // HUMAN statements and are not independent API/bank confirmation.
  assessment: 'blocked' | 'needs_human_review' | 'internal_records_documented';
  externalProviderVerification: 'not_implemented';
  issues: ExecutionException[];
  linkedDocuments: number;
}

const invalidStatuses = new Set(['void_or_reversed', 'allocation_conflict', 'over_allocated', 'source_not_visible']);
const reviewStatuses = new Set(['data_incomplete', 'no_matching_allocation', 'partially_allocated']);
const paymentDocumentTypes = new Set(['customer_invoice', 'customer_payment', 'supplier_invoice', 'supplier_payment']);
const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

export function assessAmendmentExecutionExceptions(input: ExecutionReviewInput): ExecutionReviewResult[] {
  return input.requests.map(request => {
    const issues: ExecutionException[] = [];
    const add = (code: ExceptionCode, severity: ExceptionSeverity, detail: string) => {
      if (!issues.some(issue => issue.code === code)) issues.push({ code, severity, detail });
    };
    const scoped = input.organizationId && input.bookingId
      && request.organization_id === input.organizationId && request.booking_id === input.bookingId;
    const handoff = input.handoffs.find(h => h.change_request_id === request.id);
    const links = input.evidence.filter(link => link.change_request_id === request.id);
    const allocationLines = input.allocations.filter(line => line.requestId === request.id);

    if (!input.dataComplete) {
      add('source_data_unavailable', 'block', 'بعض البيانات المالية أو سجلات التعديل لم تُقرأ بالكامل؛ لا يجوز اعتبار التقرير شاملاً');
    }
    if (!scoped || (handoff &&
        (handoff.organization_id !== input.organizationId || handoff.booking_id !== input.bookingId))) {
      add('tenant_mismatch', 'block', 'بيانات طلب التعديل أو متابعة المورد لا تتبع نفس الشركة والحجز');
    }
    if (links.some(link => link.organization_id !== input.organizationId ||
        link.booking_id !== input.bookingId)) {
      add('evidence_tenant_mismatch', 'block', 'مستند مرتبط ببيانات شركة أو حجز مختلف');
    }
    if (['cancelled', 'canceled'].includes(normalize(input.bookingStatus)) ||
        normalize(input.workflowStage) === 'cancelled') {
      add('booking_cancelled', 'block', 'الحجز الأساسي ملغى؛ امنع أي تقدم في إجراءات التعديل');
    }
    if (request.status !== 'approved') {
      add('request_not_approved', 'block', 'التعديل ليس معتمدًا إداريًا');
    }
    if (!handoff) {
      add('handoff_missing', 'review', 'لا يوجد سجل متابعة موثّق مع المورد والحسابات');
    } else if (handoff.status === 'blocked') {
      add('handoff_blocked', 'block', 'متابعة التعديل متوقفة؛ يلزم طلب جديد وفق الصلاحيات');
    } else {
      if (!handoff.supplier_reference || !handoff.supplier_confirmed_by) {
        add('supplier_reference_missing', 'review', 'مرجع إفادة المورد أو هوية المراجع غير مسجلين');
      }
      if (!['finance_reviewed', 'execution_reported'].includes(handoff.status) ||
          !handoff.finance_reference || !handoff.finance_reviewed_by) {
        add('finance_review_missing', 'review', 'مراجعة الحسابات المستقلة لم تكتمل');
      }
      if (handoff.supplier_confirmed_by && handoff.finance_reviewed_by &&
          handoff.supplier_confirmed_by === handoff.finance_reviewed_by) {
        add('independent_review_missing', 'block', 'نفس المستخدم سجل إفادة المورد ومراجعة الحسابات');
      }
      if (handoff.status !== 'execution_reported' ||
          !handoff.execution_reference || !handoff.execution_reported_by) {
        add('operations_attestation_missing', 'review', 'لم يتم تسجيل إقرار التشغيل ومرجع الإجراء الأصلي');
      }
      if (handoff.execution_reported_by && (handoff.execution_reported_by === handoff.finance_reviewed_by ||
          handoff.execution_reported_by === request.requested_by)) {
        add('independent_review_missing', 'block', 'المراجع النهائي ليس مستقلاً عن المالية أو مقدم الطلب');
      }
    }

    // Unknown amounts are deliberately NOT interpreted as zero-impact changes.
    const selling = request.proposed_selling_delta;
    const cost = request.proposed_cost_delta;
    if (selling == null || cost == null ||
        !Number.isFinite(selling) || !Number.isFinite(cost)) {
      add('financial_impact_unassessed', 'review', 'فرق البيع أو التكلفة غير محدد؛ راجع أثر التعديل المالي صراحةً');
    }
    const hasMoneyDelta = (selling != null && Number.isFinite(selling) && selling !== 0) ||
      (cost != null && Number.isFinite(cost) && cost !== 0);
    const currency = request.estimate_currency?.trim().toUpperCase();
    if (hasMoneyDelta && (!currency || !/^[A-Z]{3}$/.test(currency))) {
      add('currency_missing', 'block', 'فرق المبلغ لا يتضمن عملة صحيحة؛ لا تُجرِ جمعًا أو تحويلًا مفترضًا');
    }

    if (input.evidence.length >= 200 || links.length >= 200) {
      add('financial_documents_truncated', 'block', 'عدد الروابط عند حد عرض القائمة؛ تحقق من عدم وجود مستندات محجوبة');
    }
    const linkedTypes = new Set(links.map(link => link.source_type));
    if (selling != null && Number.isFinite(selling) && selling !== 0 &&
        ![...linkedTypes].some(t => t === 'customer_invoice' || t === 'customer_payment')) {
      add('customer_document_missing', 'review', 'فرق البيع المسجل غير مرتبط بمستند عميل من نفس الحجز');
    }
    if (cost != null && Number.isFinite(cost) && cost !== 0 &&
        ![...linkedTypes].some(t => t === 'supplier_invoice' || t === 'supplier_payment')) {
      add('supplier_document_missing', 'review', 'فرق تكلفة المورد غير مرتبط بمستند مورد من نفس الحجز');
    }

    // Every finance link must have a CURRENT reconciliation result. A
    // historical snapshot alone is insufficient, especially after reversals.
    const byEvidenceId = new Map(allocationLines.map(line => [line.evidenceId, line]));
    for (const link of links) {
      if (!paymentDocumentTypes.has(link.source_type)) continue;
      const line = byEvidenceId.get(link.id);
      if (!line || !line.state || reviewStatuses.has(line.state)) {
        add('source_allocation_unverified', 'review', 'تخصيص مستند مالي غير مكتمل أو غير موجود في سجلات الحسابات الحالية');
        continue;
      }
      if (line.changedSinceLink) {
        add('source_document_changed', 'block', 'تغيرت حالة أو قيمة أو عملة مستند مالي منذ ربطه');
      }
      if (invalidStatuses.has(line.state)) {
        add('source_document_invalid', 'block', 'مستند ملغى أو عكسي أو تخصيص متعارض/زائد؛ يلزم فحص محاسبي');
      }
    }

    const assessment = issues.some(i => i.severity === 'block')
      ? 'blocked'
      : issues.length ? 'needs_human_review' : 'internal_records_documented';
    return {
      requestId: request.id,
      assessment,
      externalProviderVerification: 'not_implemented' as const,
      issues,
      linkedDocuments: links.length,
    };
  });
}
