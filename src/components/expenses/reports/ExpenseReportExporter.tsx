
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Download, FileText, Table, PieChart } from 'lucide-react';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

const ExpenseReportExporter = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState<string>('');
  const [format, setFormat] = useState<string>('');

  const handleExport = async () => {
    if (!reportType || !format) {
      toast.error('يرجى اختيار نوع التقرير والصيغة');
      return;
    }

    try {
      // محاكاة عملية التصدير
      toast.success(`جاري تصدير التقرير بصيغة ${format}...`);
      
      // هنا يمكن إضافة منطق التصدير الفعلي
      setTimeout(() => {
        toast.success('تم تصدير التقرير بنجاح');
      }, 2000);
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

  const reportTypes = [
    { value: 'summary', label: 'تقرير ملخص المصروفات' },
    { value: 'detailed', label: 'تقرير تفصيلي' },
    { value: 'salaries', label: 'تقرير الرواتب' },
    { value: 'rent', label: 'تقرير الإيجارات' },
    { value: 'budget_variance', label: 'تقرير انحراف الميزانية' },
    { value: 'cash_flow', label: 'تقرير التدفق النقدي' }
  ];

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'excel', label: 'Excel', icon: Table },
    { value: 'csv', label: 'CSV', icon: Table }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير التقارير المالية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">نوع التقرير</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع التقرير" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">صيغة الملف</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="اختر صيغة الملف" />
              </SelectTrigger>
              <SelectContent>
                {exportFormats.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    <div className="flex items-center gap-2">
                      <fmt.icon className="h-4 w-4" />
                      {fmt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الفترة الزمنية</label>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            تصدير التقرير
          </Button>
          <Button variant="outline" className="flex-1">
            <PieChart className="h-4 w-4 mr-2" />
            معاينة التقرير
          </Button>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>ملاحظة:</strong> سيتم إرسال التقرير إلى بريدك الإلكتروني عند اكتمال التصدير.
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseReportExporter;
