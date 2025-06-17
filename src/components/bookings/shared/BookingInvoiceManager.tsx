import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInvoicesData } from '@/hooks/invoices/useInvoicesData';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { CreditCard, FileText, Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BookingInvoiceManagerProps {
  bookingId: string;
  bookingType: 'hotel' | 'flight' | 'transport' | 'car_rental';
  onCreateInvoice: () => void;
}

const BookingInvoiceManager = ({ bookingId, bookingType, onCreateInvoice }: BookingInvoiceManagerProps) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  // جلب الفواتير المرتبطة بهذا الحجز
  const { data: invoices, isLoading: invoicesLoading } = useInvoicesData({
    bookingType: bookingType
  });
  
  // فلترة الفواتير الخاصة بهذا الحجز
  const bookingInvoices = invoices?.filter(invoice => invoice.booking_id === bookingId) || [];
  
  // جلب المدفوعات للفاتورة المحددة
  const { payments, isLoading: paymentsLoading } = useInvoicePayments(selectedInvoiceId || undefined);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'مسودة', variant: 'secondary' as const, className: '' },
      sent: { label: 'مرسلة', variant: 'default' as const, className: '' },
      paid: { label: 'مدفوعة', variant: 'default' as const, className: 'bg-green-500 text-white' },
      overdue: { label: 'متأخرة', variant: 'destructive' as const, className: '' },
      cancelled: { label: 'ملغاة', variant: 'outline' as const, className: '' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig = {
      unpaid: { label: 'غير مدفوعة', variant: 'destructive' as const, className: '' },
      partially_paid: { label: 'مدفوعة جزئياً', variant: 'default' as const, className: '' },
      fully_paid: { label: 'مدفوعة كاملاً', variant: 'default' as const, className: 'bg-green-500 text-white' },
    };
    
    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (invoicesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            الفواتير والمدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            الفواتير والمدفوعات
          </div>
          {bookingInvoices.length === 0 && (
            <Button onClick={onCreateInvoice} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              إنشاء فاتورة
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookingInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد فواتير لهذا الحجز</p>
            <p className="text-sm">انقر على "إنشاء فاتورة" لإنشاء فاتورة جديدة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookingInvoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">فاتورة رقم: {invoice.invoice_number}</h4>
                    <p className="text-sm text-gray-600">
                      تاريخ الإصدار: {format(new Date(invoice.issued_date), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(invoice.status)}
                    {getPaymentStatusBadge(invoice.payment_status || 'unpaid')}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-gray-600">المبلغ الإجمالي:</span>
                    <p className="font-semibold">{invoice.final_amount?.toLocaleString()} {invoice.currency}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">المبلغ المدفوع:</span>
                    <p className="font-semibold text-green-600">
                      {(invoice.total_paid_amount || 0).toLocaleString()} {invoice.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">المتبقي:</span>
                    <p className="font-semibold text-red-600">
                      {(invoice.remaining_amount || 0).toLocaleString()} {invoice.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">تاريخ الاستحقاق:</span>
                    <p className="text-sm">
                      {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar }) : 'غير محدد'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedInvoiceId(
                      selectedInvoiceId === invoice.id ? null : invoice.id
                    )}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {selectedInvoiceId === invoice.id ? 'إخفاء' : 'عرض'} المدفوعات
                  </Button>
                </div>

                {/* عرض المدفوعات */}
                {selectedInvoiceId === invoice.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      سجل المدفوعات
                    </h5>
                    
                    {paymentsLoading ? (
                      <div className="text-center py-2">جاري تحميل المدفوعات...</div>
                    ) : payments.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        لا توجد مدفوعات لهذه الفاتورة
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-2 bg-white rounded border">
                            <div>
                              <span className="font-medium">{payment.payment_amount.toLocaleString()} جنيه</span>
                              <span className="text-sm text-gray-600 mr-2">
                                - {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {payment.payment_method === 'cash' ? 'نقداً' : 
                               payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                               payment.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 
                               payment.payment_method}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingInvoiceManager;
