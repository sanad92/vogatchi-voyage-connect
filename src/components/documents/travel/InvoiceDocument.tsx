import { forwardRef } from 'react';
import { fmtMoney, type InvoiceDocModel } from '@/lib/travelDocuments';
import { DocFooter, DocHeader, DocSectionTitle, FactGrid, ServiceSectionCard } from './DocumentParts';

interface Props {
  model: InvoiceDocModel;
}

export const InvoiceDocument = forwardRef<HTMLDivElement, Props>(({ model }, ref) => {
  const { totals } = model;
  const badgeTone =
    model.paymentStatus.key === 'paid' ? 'ok' : model.paymentStatus.key === 'partial' ? 'warn' : 'muted';

  return (
    <article ref={ref} dir="rtl" className="doc-sheet flex flex-col">
      <DocHeader
        brand={model.brand}
        titleAr="فاتورة"
        titleEn="Invoice"
        badge={{ label: model.paymentStatus.labelAr, tone: badgeTone as any }}
        meta={[
          { label: 'رقم الفاتورة', value: model.documentNumber },
          { label: 'مرجع الحجز', value: model.bookingReference || '—' },
          { label: 'تاريخ الإصدار', value: model.issuedDate || '—' },
          { label: 'تاريخ الاستحقاق', value: model.dueDate || '—' },
        ]}
      />

      <div className="px-10 py-7 space-y-7 flex-1">
        <section className="doc-block">
          <DocSectionTitle>بيانات العميل</DocSectionTitle>
          <FactGrid
            columns={4}
            facts={[
              { label: 'الاسم', value: model.customer.name },
              ...(model.customer.phone ? [{ label: 'الهاتف', value: model.customer.phone }] : []),
              ...(model.customer.email ? [{ label: 'البريد الإلكتروني', value: model.customer.email }] : []),
              ...(model.customer.nationality
                ? [{ label: 'الجنسية', value: model.customer.nationality }]
                : []),
            ]}
          />
        </section>

        <section>
          <DocSectionTitle>تفاصيل الرحلة والخدمات</DocSectionTitle>
          {model.sections.map((s, i) => (
            <ServiceSectionCard key={`${s.kind}-${i}`} section={s} />
          ))}
        </section>

        <section className="doc-block">
          <DocSectionTitle>البنود المالية</DocSectionTitle>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-right font-semibold px-4 py-2 border doc-rule">البيان</th>
                <th className="text-center font-semibold px-3 py-2 border doc-rule w-20">الكمية</th>
                <th className="text-center font-semibold px-3 py-2 border doc-rule w-32">سعر الوحدة</th>
                <th className="text-center font-semibold px-3 py-2 border doc-rule w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {model.lineItems.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 border doc-rule">{it.description}</td>
                  <td className="px-3 py-2 border doc-rule text-center">{it.quantity}</td>
                  <td className="px-3 py-2 border doc-rule text-center" dir="ltr">
                    {fmtMoney(it.unitPrice, totals.currency)}
                  </td>
                  <td className="px-3 py-2 border doc-rule text-center font-semibold" dir="ltr">
                    {fmtMoney(it.total, totals.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-[300px] text-[12px]">
              <Row label="المجموع الفرعي" value={fmtMoney(totals.subtotal, totals.currency)} />
              {totals.discount > 0 && (
                <Row label="الخصم" value={`- ${fmtMoney(totals.discount, totals.currency)}`} />
              )}
              {totals.vat > 0 && (
                <Row
                  label={`الضريبة${totals.vatRate ? ` (${totals.vatRate}%)` : ''}`}
                  value={fmtMoney(totals.vat, totals.currency)}
                />
              )}
              <div className="doc-band rounded-lg px-4 py-2.5 flex items-center justify-between mt-2">
                <span className="text-[12px] font-semibold">الإجمالي المستحق</span>
                <span className="text-[14px] font-bold" dir="ltr">
                  {fmtMoney(totals.total, totals.currency)}
                </span>
              </div>
              <div className="mt-2">
                <Row label="المدفوع" value={fmtMoney(totals.paid, totals.currency)} />
                <Row
                  label="الرصيد المتبقي"
                  value={fmtMoney(totals.balance, totals.currency)}
                  strong
                />
              </div>
            </div>
          </div>
        </section>

        {(model.customerNotes.length > 0 || model.terms) && (
          <section className="doc-block">
            <DocSectionTitle>ملاحظات وشروط</DocSectionTitle>
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
      </div>

      <DocFooter brand={model.brand} />
    </article>
  );
});

InvoiceDocument.displayName = 'InvoiceDocument';

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-center justify-between py-1.5 border-b doc-rule last:border-0">
    <span className={strong ? 'font-semibold' : 'doc-muted'}>{label}</span>
    <span className={strong ? 'font-bold' : 'font-medium'} dir="ltr">
      {value}
    </span>
  </div>
);
