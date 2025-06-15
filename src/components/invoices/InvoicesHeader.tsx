
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Receipt, AlertCircle, CheckCircle } from 'lucide-react';

interface InvoicesHeaderProps {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  pendingInvoices: number;
  onCreateInvoice: () => void;
}

const InvoicesHeader = ({ 
  totalInvoices, 
  paidInvoices, 
  overdueInvoices, 
  pendingInvoices,
  onCreateInvoice 
}: InvoicesHeaderProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة الفواتير</h1>
          <p className="text-gray-600">إدارة شاملة لجميع الفواتير والمدفوعات</p>
        </div>
        <Button onClick={onCreateInvoice} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إنشاء فاتورة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              جميع الفواتير في النظام
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير مدفوعة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              تم دفعها بالكامل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير متأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">
              تجاوزت تاريخ الاستحقاق
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير معلقة</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              في انتظار الدفع
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoicesHeader;
