import { forwardRef } from 'react';
import type { bookingVoucherState } from '@/lib/bookingVoucher';
import type { VoucherDocModel } from '@/lib/travelDocuments';
import { DocFooter, DocHeader, DocSectionTitle, FactGrid, ServiceSectionCard } from './DocumentParts';

interface Props {
  model: VoucherDocModel;
  state: ReturnType<typeof bookingVoucherState>;
}

/**
 * Customer / supplier facing travel voucher.
 * By contract this component receives `VoucherDocModel`, which carries no
 * monetary fields at all — never add price, cost, totals or payment data here.
 */
export const VoucherDocument = forwardRef<HTMLDivElement, Props>(({ model, state }, ref) => (
  <article ref={ref} dir="rtl" className="doc-sheet flex flex-col">
    <DocHeader
      brand={model.brand}
      titleAr={state === 'current' ? 'فاوتشر تأكيد الحجز' : 'معاينة فاوتشر مؤرشف'}
      titleEn="Travel Voucher"
      badge={state === 'current' ? { label: 'حجز مؤكد', tone: 'ok' }
        : { label: state === 'cancelled' ? 'حجز ملغي' : 'حجز غير مؤكد', tone: 'warn' }}
      meta={[
        { label: 'رقم الفاوتشر', value: model.voucherNumber },
        { label: 'مرجع الحجز', value: model.bookingReference || '—' },
        { label: 'تاريخ الإصدار', value: model.issuedDate || '—' },
        { label: 'الوجهة', value: model.destination || '—' },
      ]}
    />

    <div className="px-10 py-7 space-y-7 flex-1">
      <section className="doc-block">
        <DocSectionTitle>المسافر الرئيسي</DocSectionTitle>
        <FactGrid
          columns={4}
          facts={[
            { label: 'الاسم', value: model.traveler.name },
            ...(model.traveler.nationality
              ? [{ label: 'الجنسية', value: model.traveler.nationality }]
              : []),
            ...(model.traveler.phone ? [{ label: 'الهاتف', value: model.traveler.phone }] : []),
            ...(model.traveler.email ? [{ label: 'البريد الإلكتروني', value: model.traveler.email }] : []),
            ...(model.travelStart ? [{ label: 'بداية الرحلة', value: model.travelStart }] : []),
            ...(model.travelEnd ? [{ label: 'نهاية الرحلة', value: model.travelEnd }] : []),
          ]}
        />
      </section>

      <section>
        <DocSectionTitle>{state === 'current' ? 'الخدمات المؤكدة' : 'الخدمات المسجلة'}</DocSectionTitle>
        {model.sections.map((s, i) => (
          <ServiceSectionCard key={`${s.kind}-${i}`} section={s} />
        ))}
      </section>

      {model.specialRequests.length > 0 && (
        <section className="doc-block">
          <DocSectionTitle>طلبات خاصة</DocSectionTitle>
          <div className="flex flex-wrap gap-2">
            {model.specialRequests.map((r, i) => (
              <span key={i} className="doc-chip rounded-full px-3 py-1 text-[11.5px]">
                {r}
              </span>
            ))}
          </div>
        </section>
      )}

      {(model.customerNotes.length > 0 || model.terms) && (
        <section className="doc-block">
          <DocSectionTitle>ملاحظات مهمة</DocSectionTitle>
          <div className="doc-soft rounded-xl border doc-rule px-5 py-4 space-y-2">
            {model.customerNotes.map((n, i) => (
              <p key={i} className="text-[11.5px] leading-6 whitespace-pre-line">
                {n}
              </p>
            ))}
            {model.terms && (
              <p className="doc-muted text-[11px] leading-6 whitespace-pre-line">{model.terms}</p>
            )}
          </div>
        </section>
      )}

      <section className="doc-block">
        <DocSectionTitle>الدعم على مدار الرحلة</DocSectionTitle>
        <div className="rounded-xl border doc-rule px-5 py-4">
          <p className="text-[12px] leading-6">
            لأي استفسار أو مساعدة أثناء رحلتك، يسعدنا تواصلك مع فريق {model.brand.name} في أي وقت.
          </p>
          <p className="text-[12px] font-semibold mt-2" dir="ltr">
            {[model.brand.phone, model.brand.email, model.brand.website].filter(Boolean).join('  ·  ') ||
              '—'}
          </p>
          <p className="doc-muted text-[11px] mt-2">
            {state === 'current' ? 'يرجى إبراز هذا الفاوتشر عند الوصول لمقدّم الخدمة.'
              : 'هذا المستند مؤرشف ولا يُستخدم كتأكيد لدى مقدم الخدمة.'}
          </p>
        </div>
      </section>
    </div>

    <DocFooter brand={model.brand} />
  </article>
));

VoucherDocument.displayName = 'VoucherDocument';
