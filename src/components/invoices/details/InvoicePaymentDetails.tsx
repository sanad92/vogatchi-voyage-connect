
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CreditCard } from 'lucide-react';

interface InvoicePaymentDetailsProps {
  invoice: any;
}

const InvoicePaymentDetails = ({ invoice }: InvoicePaymentDetailsProps) => {
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return <Badge className="bg-green-100 text-green-800">مدفوعة بالكامل</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800">مدفوعة جزئياً</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">غير مدفوعة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const paymentProgress = invoice?.final_amount > 0 
    ? ((invoice?.total_paid_amount || 0) / invoice?.final_amount) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          تفاصيل المدفوعات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">إجمالي الفاتورة</p>
            <p className="text-xl font-bold text-blue-600">
              {invoice?.final_amount?.toLocaleString()} {invoice?.currency}
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm text-gray-600">المبلغ المدفوع</p>
            <p className="text-xl font-bold text-green-600">
              {invoice?.total_paid_amount?.toLocaleString()} {invoice?.currency}
            </p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-sm text-gray-600">المبلغ المتبقي</p>
            <p className="text-xl font-bold text-red-600">
              {invoice?.remaining_amount?.toLocaleString()} {invoice?.currency}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">حالة الدفع:</span>
            {getPaymentStatusBadge(invoice?.payment_status)}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>تقدم الدفع</span>
              <span>{paymentProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${paymentProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {invoice?.paid_date && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-medium">تاريخ آخر دفعة:</span> 
              {new Date(invoice.paid_date).toLocaleDateString('ar-EG')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoicePaymentDetails;
