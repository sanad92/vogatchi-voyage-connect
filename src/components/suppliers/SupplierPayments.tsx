import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRefundAmount } from '@/components/finance/RefundMovements';
import type { Tables } from '@/integrations/supabase/types';

type Payment = Pick<Tables<'supplier_payments'>,
  'id' | 'reference_number' | 'payment_reference' | 'status' | 'amount' | 'currency' |
  'paid_date' | 'payment_date' | 'payment_method'>;

interface SupplierPaymentsProps {
  supplierId: string;
  canManage: boolean;
  payments: Payment[];
  state: { isPending: boolean; isError: boolean };
}

const SupplierPayments = ({ supplierId, canManage, payments, state }: SupplierPaymentsProps) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "معلّقة لم تُصرف",
      paid: "مدفوع",
      completed: "مدفوع",
      cancelled: "ملغي"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bank_transfer: "تحويل بنكي",
      cash: "نقدي",
      check: "شيك",
      credit_card: "بطاقة ائتمان"
    };
    return methods[method as keyof typeof methods] || method;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">مدفوعات المورد</h3>
        {canManage && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/payment-orders?supplier_id=${supplierId}`}>اعتماد وصرف أوامر الدفع</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          {state.isError ? (
            <p role="alert" className="text-sm text-destructive">تعذر تحميل مدفوعات المورد.</p>
          ) : state.isPending ? (
            <p className="text-sm text-muted-foreground">جاري تحميل المدفوعات...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مدفوعات لهذا المورد</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  {['المرجع', 'التاريخ', 'المبلغ', 'الوسيلة', 'الحالة'].map(label => <th key={label} className="p-2">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => {
                  const status = payment.status || 'pending';
                  return (
                    <tr key={payment.id} className="border-b">
                      <td className="p-2">{payment.reference_number || payment.payment_reference || '—'}</td>
                      <td className="p-2">{payment.payment_date || payment.paid_date || '—'}</td>
                      <td className="p-2">{formatRefundAmount(payment.amount, payment.currency || 'EGP')}</td>
                      <td className="p-2">{payment.payment_method ? getPaymentMethodLabel(payment.payment_method) : '—'}</td>
                      <td className="p-2"><Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPayments;
