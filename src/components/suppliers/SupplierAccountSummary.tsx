import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRefundAmount } from '@/components/finance/RefundMovements';
import { summarizeSupplierPayables, type SupplierInvoice } from '@/lib/supplierPayables';

export function SupplierAccountSummary({ supplierId, invoices, state }: {
  supplierId: string;
  invoices: SupplierInvoice[];
  state: { isPending: boolean; isError: boolean };
}) {
  const balances = summarizeSupplierPayables(invoices, format(new Date(), 'yyyy-MM-dd'));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ملخص حساب المورد</CardTitle>
      </CardHeader>
      <CardContent>
        {state.isError ? (
          <p role="alert" className="text-sm text-destructive">تعذر تحميل مستحقات المورد.</p>
        ) : state.isPending ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل المستحقات…</p>
        ) : balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد فواتير مورد مستحقة.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {balances.map(({ currency, outstanding, overdue, invoices }) => (
              <div key={currency} className="space-y-3 rounded-md border p-3 text-sm">
                <dl className="space-y-1">
                  <div className="flex flex-wrap justify-between gap-x-2">
                    <dt>المستحق للمورد</dt>
                    <dd className="font-semibold" dir="ltr">{formatRefundAmount(outstanding, currency)}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-2">
                    <dt>منه متأخر</dt>
                    <dd className={overdue > 0 ? 'font-semibold text-destructive' : ''} dir="ltr">{formatRefundAmount(overdue, currency)}</dd>
                  </div>
                </dl>
                <details>
                  <summary className="cursor-pointer text-primary">الفواتير المستحقة ({invoices.length})</summary>
                  <ul className="mt-2 max-h-64 divide-y overflow-auto">
                    {invoices.map(invoice => (
                      <li key={invoice.id} className="flex flex-wrap justify-between gap-x-2 py-1.5">
                        <Link className="text-primary underline" to={`/suppliers/${supplierId}/workspace?tab=finance#supplier-invoice-${invoice.id}`}>
                          {invoice.invoice_number}
                        </Link>
                        <span dir="ltr">{formatRefundAmount(invoice.remaining, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
