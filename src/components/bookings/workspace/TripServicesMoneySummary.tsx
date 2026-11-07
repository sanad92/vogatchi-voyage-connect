import { AlertTriangle, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { groupLinkedServicesByCurrency } from '@/lib/tripFile/serviceSummary';
import type { LinkedServiceBooking } from '@/hooks/useBookingServices';

const money = (number: number, currency: string) =>
  `${number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;

/**
 * Read-only summary of linked service rows, separate from the authoritative
 * financial ledger. NEVER sum currencies or write back to bookings/invoices.
 */
export function TripServicesMoneySummary({ services }: { services: LinkedServiceBooking[] }) {
  const groups = groupLinkedServicesByCurrency(services);
  if (!groups.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Coins className="h-4 w-4" /> ملخص الأسعار المدخلة للخدمات (حسب العملة)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ملخص مبدئي من حجوزات الخدمات المرتبطة بالرحلة. لا يمثل الربح المالي المعتمد،
          ولا يشمل بالضرورة الضرائب أو الفروقات أو مصروفات إضافية.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(group => {
          const incomplete = group.incompleteNumbers > 0;
          const noCurrency = group.currency === null;
          const showTotals = !incomplete && !noCurrency;
          return (
            <div className="rounded-lg border p-3 space-y-2" key={group.currency || 'missing'}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{group.currency || 'عملة غير محددة'}</p>
                <span className="text-xs text-muted-foreground">{group.count} خدمات</span>
              </div>
              {showTotals ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2"><span>إجمالي البيع المسجل</span><span>{money(group.totalSelling, group.currency!)}</span></div>
                  <div className="flex justify-between gap-2"><span>إجمالي التكلفة المسجلة</span><span>{money(group.totalCost, group.currency!)}</span></div>
                  <div className="flex justify-between gap-2 font-medium border-t pt-2">
                    <span>الفرق التقديري</span><span>{money(group.indicativeGrossProfit, group.currency!)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {noCurrency
                    ? 'فيه خدمات من غير عملة واضحة؛ مش هنضيفها لإجمالي أي عملة تانية.'
                    : 'بعض القيم غير صالحة؛ مش هنعرض فرق ربح غير موثوق.'}
                </p>
              )}
              {group.zeroCostRecords > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {group.zeroCostRecords} خدمة بتكلفة صفر — راجع هل مجانية فعلًا ولا التكلفة ناقصة.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
