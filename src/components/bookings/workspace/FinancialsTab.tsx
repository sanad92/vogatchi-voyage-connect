import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingFinancialWorkspace from '@/components/bookings/BookingFinancialWorkspace';
import BookingAccountingPanel from '@/components/bookings/BookingAccountingPanel';
import RecordPaymentDialog from './RecordPaymentDialog';
import { BookingProfitCockpit } from './BookingProfitCockpit';
import type { Workspace } from './types';


interface Props {
  workspace: Workspace;
}

export const FinancialsTab = ({ workspace }: Props) => {
  const f = workspace.financials;
  const paymentInvoices = (workspace.invoices as Array<Record<string, unknown>>).map((invoice) => ({
    id: String(invoice.id),
    invoice_number: typeof invoice.invoice_number === 'string' ? invoice.invoice_number : null,
    total_amount: Number(invoice.total_amount ?? invoice.final_amount ?? 0),
  }));
  const payments = workspace.payments as Array<{
    id: string;
    amount?: number | null;
    currency?: string | null;
    created_at: string;
    status?: string | null;
  }>;
  return (
    <div className="space-y-4">
      {workspace.booking?.id && <BookingProfitCockpit bookingId={workspace.booking.id} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">إجراءات التحصيل</CardTitle>
          {workspace.booking?.id && (
            <RecordPaymentDialog
              bookingId={workspace.booking.id}
              customerId={workspace.booking.customer_id ?? workspace.customer?.id}
              currency={f.currency}
              outstanding={f.outstanding}
              invoices={paymentInvoices}
              onSaved={() => workspace.refetch()}
            />
          )}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">سجّل تحصيلًا جديدًا ثم راجع أثره فورًا في تسوية العميل وربحية الحجز.</CardContent>
      </Card>

      {workspace.booking?.id && (
        <>
          <BookingFinancialWorkspace bookingId={workspace.booking.id} />
          <BookingAccountingPanel bookingId={workspace.booking.id} currency={workspace.booking.currency} />
        </>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">الدفعات ({workspace.payments.length})</CardTitle>
          {workspace.booking?.id && (
            <RecordPaymentDialog
              bookingId={workspace.booking.id}
              customerId={workspace.booking.customer_id ?? workspace.customer?.id}
              currency={f.currency}
              outstanding={f.outstanding}
              invoices={paymentInvoices}
              onSaved={() => workspace.refetch()}
            />
          )}
        </CardHeader>
        <CardContent>
          {workspace.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة. اضغط "تسجيل دفعة" لإضافة أول دفعة من العميل.</p>
          ) : (

            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {Number(p.amount).toLocaleString()} {p.currency || f.currency}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <Badge variant={p.status === 'completed' || p.status === 'succeeded' ? 'default' : 'outline'}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
