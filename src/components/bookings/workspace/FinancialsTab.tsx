import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingFinancialWorkspace from '@/components/bookings/BookingFinancialWorkspace';
import BookingAccountingPanel from '@/components/bookings/BookingAccountingPanel';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const FinancialsTab = ({ workspace }: Props) => {
  const f = workspace.financials;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملخص مالي</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="إجمالي الفواتير" value={`${f.invoiced.toLocaleString()} ${f.currency}`} />
          <Stat label="المدفوع" value={`${f.paid.toLocaleString()} ${f.currency}`} tone="positive" />
          <Stat label="المستحق" value={`${f.outstanding.toLocaleString()} ${f.currency}`} tone={f.outstanding > 0 ? 'negative' : 'default'} />
          <Stat label="الربح" value={`${f.profit.toLocaleString()} ${f.currency}`} tone={f.profit >= 0 ? 'positive' : 'negative'} />
        </CardContent>
      </Card>

      {workspace.booking?.id && (
        <>
          <BookingFinancialWorkspace bookingId={workspace.booking.id} />
          <BookingAccountingPanel bookingId={workspace.booking.id} currency={workspace.booking.currency} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الدفعات ({workspace.payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {workspace.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة.</p>
          ) : (
            <div className="space-y-2">
              {workspace.payments.map((p: any) => (
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

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'positive' | 'negative' | 'default';
}) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p
      className={`font-semibold ${
        tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-destructive' : ''
      }`}
    >
      {value}
    </p>
  </div>
);
