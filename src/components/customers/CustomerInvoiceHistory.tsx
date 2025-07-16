import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Eye, 
  DollarSign,
  Calendar,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerInvoiceHistoryProps {
  customerId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issued_date: string;
  due_date: string;
  final_amount: number;
  total_paid_amount: number;
  remaining_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  booking_type: string;
  notes: string;
}

const CustomerInvoiceHistory = ({ customerId }: CustomerInvoiceHistoryProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [customerId]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ في تحميل سجل الفواتير');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'مسودة',
      sent: 'مرسلة',
      paid: 'مدفوعة',
      overdue: 'متأخرة',
      cancelled: 'ملغاة'
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      unpaid: 'غير مدفوعة',
      partially_paid: 'مدفوعة جزئياً',
      fully_paid: 'مدفوعة بالكامل'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'secondary',
      sent: 'default',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'outline'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      unpaid: 'destructive',
      partially_paid: 'secondary',
      fully_paid: 'default'
    };
    return colors[status] || 'default';
  };

  const getBookingTypeLabel = (type: string) => {
    const types = {
      hotel: 'حجز فندق',
      flight: 'حجز طيران',
      transport: 'حجز نقل',
      car_rental: 'إيجار سيارة'
    };
    return types[type] || type;
  };

  const exportInvoicesData = () => {
    const exportData = {
      customer_id: customerId,
      invoices: invoices,
      export_date: new Date().toISOString(),
      summary: {
        total_invoices: invoices.length,
        total_amount: invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0),
        total_paid: invoices.reduce((sum, inv) => sum + (inv.total_paid_amount || 0), 0),
        total_remaining: invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0)
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `customer-invoices-${customerId}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('تم تصدير سجل الفواتير بنجاح');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل سجل الفواتير...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.total_paid_amount || 0), 0);
  const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{invoices.length}</div>
            <div className="text-sm text-muted-foreground">إجمالي الفواتير</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">إجمالي المبلغ (ج.م)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">المبلغ المدفوع</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{totalRemaining.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">المبلغ المتبقي</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportInvoicesData}>
          <Download className="h-4 w-4 mr-2" />
          تصدير البيانات
        </Button>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد فواتير لهذا العميل</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        فاتورة #{invoice.invoice_number}
                        <Badge variant="outline">
                          {getBookingTypeLabel(invoice.booking_type)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        تاريخ الإصدار: {formatDate(invoice.issued_date)}
                        {invoice.due_date && (
                          <span className="mr-4">
                            تاريخ الاستحقاق: {formatDate(invoice.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left space-y-1">
                    <div className="font-semibold">
                      {invoice.final_amount?.toLocaleString()} {invoice.currency}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                      <Badge variant={getPaymentStatusColor(invoice.payment_status)}>
                        {getPaymentStatusLabel(invoice.payment_status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      المبلغ الإجمالي
                    </div>
                    <div className="font-medium">
                      {invoice.final_amount?.toLocaleString()} {invoice.currency}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      المبلغ المدفوع
                    </div>
                    <div className="font-medium text-green-600">
                      {invoice.total_paid_amount?.toLocaleString()} {invoice.currency}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      المبلغ المتبقي
                    </div>
                    <div className="font-medium text-red-600">
                      {invoice.remaining_amount?.toLocaleString()} {invoice.currency}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-muted-foreground">ملاحظات:</div>
                    <div className="text-sm mt-1">{invoice.notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    عرض
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3 mr-1" />
                    تحميل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerInvoiceHistory;