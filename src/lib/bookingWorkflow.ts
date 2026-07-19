import type { WorkflowStage } from '@/hooks/useBookingWorkspace';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type ProfitHealth = 'healthy' | 'thin' | 'loss';

export interface DerivedStatus {
  payment: PaymentStatus;
  profit: ProfitHealth;
  margin: number;
}

export const derivePaymentStatus = (
  invoiced: number,
  paid: number,
  refunded = 0,
): PaymentStatus => {
  if (refunded > 0 && refunded >= paid) return 'refunded';
  if (invoiced <= 0) return 'unpaid';
  if (paid <= 0) return 'unpaid';
  if (paid + 0.01 >= invoiced) return 'paid';
  return 'partial';
};

export const deriveProfitHealth = (profit: number, selling: number): ProfitHealth => {
  if (profit < 0) return 'loss';
  const margin = selling > 0 ? (profit / selling) * 100 : 0;
  return margin < 8 ? 'thin' : 'healthy';
};

export interface NextAction {
  key: string;
  title: string;
  rationale: string;
  ctaLabel: string;
  ctaPath?: string;
  advanceTo?: WorkflowStage;
}

export interface WorkflowContext {
  stage: WorkflowStage | null | undefined;
  bookingId: string;
  hasInvoice: boolean;
  hasVoucher: boolean;
  paymentStatus: PaymentStatus;
  hasCustomerPhone: boolean;
}

export const recommendNextAction = (ctx: WorkflowContext): NextAction => {
  const s = (ctx.stage || 'lead') as WorkflowStage;
  const invoicePath = `/invoices/new?booking_id=${ctx.bookingId}`;
  const paymentPath = `/bookings/${ctx.bookingId}/workspace?tab=financials`;

  if (s === 'lead' || s === 'qualified') {
    return {
      key: 'create-quote',
      title: 'إنشاء عرض سعر',
      rationale: 'العميل مؤهل — ابدأ عرض السعر لتحويل الفرصة إلى حجز.',
      ctaLabel: 'إنشاء عرض سعر',
      ctaPath: `/quotes/new?booking_id=${ctx.bookingId}`,
      advanceTo: 'quoted',
    };
  }
  if (s === 'quoted' && !ctx.hasInvoice) {
    return {
      key: 'issue-invoice',
      title: 'إصدار فاتورة',
      rationale: 'تم إرسال العرض — أصدر الفاتورة لتأكيد الحجز.',
      ctaLabel: 'إصدار فاتورة',
      ctaPath: invoicePath,
      advanceTo: 'confirmed',
    };
  }
  if ((s === 'confirmed' || s === 'quoted') && ctx.paymentStatus !== 'paid') {
    return {
      key: 'record-payment',
      title: 'تسجيل دفعة',
      rationale:
        ctx.paymentStatus === 'partial'
          ? 'تم تحصيل دفعة جزئية — سجّل باقي المبلغ.'
          : 'الحجز مؤكد — سجّل الدفعة الأولى من العميل.',
      ctaLabel: 'تسجيل دفعة',
      ctaPath: paymentPath,
      advanceTo: ctx.paymentStatus === 'partial' ? undefined : 'paid',
    };
  }
  if (s === 'paid' && !ctx.hasVoucher) {
    return {
      key: 'issue-voucher',
      title: 'إصدار فاوتشر',
      rationale: 'تم استلام الدفعة — أصدر الفاوتشر للعميل والمورد.',
      ctaLabel: 'إصدار فاوتشر',
      ctaPath: `/bookings/${ctx.bookingId}/workspace?tab=documents`,
      advanceTo: 'operations',
    };
  }
  if (s === 'operations' || s === 'traveling') {
    return {
      key: 'send-pretravel',
      title: 'رسالة ما قبل السفر',
      rationale: 'أرسل قالب واتساب لتذكير العميل بتفاصيل الرحلة.',
      ctaLabel: 'فتح واتساب',
      ctaPath: `/bookings/${ctx.bookingId}/workspace?tab=whatsapp`,
      advanceTo: s === 'operations' ? 'traveling' : 'completed',
    };
  }
  if (s === 'completed' || s === 'post_travel') {
    return {
      key: 'request-review',
      title: 'طلب تقييم',
      rationale: 'انتهت الرحلة — اطلب من العميل تقييم التجربة.',
      ctaLabel: 'إرسال طلب تقييم',
      ctaPath: `/bookings/${ctx.bookingId}/workspace?tab=whatsapp`,
      advanceTo: 'post_travel',
    };
  }
  return {
    key: 'none',
    title: 'لا توجد خطوة موصى بها',
    rationale: 'كل شيء يبدو على ما يرام.',
    ctaLabel: 'تحديث',
  };
};

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  lead: 'عميل محتمل',
  qualified: 'مؤهل',
  quoted: 'تم عرض السعر',
  confirmed: 'مؤكد',
  paid: 'مدفوع',
  operations: 'تشغيل',
  traveling: 'مسافر',
  completed: 'مكتمل',
  post_travel: 'ما بعد السفر',
  cancelled: 'ملغي',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً',
  paid: 'مدفوع بالكامل',
  refunded: 'مسترد',
};

export const PROFIT_LABELS: Record<ProfitHealth, string> = {
  healthy: 'ربح صحي',
  thin: 'هامش ضعيف',
  loss: 'خسارة',
};
