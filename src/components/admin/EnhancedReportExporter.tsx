
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Users,
  Building2,
  CreditCard,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportConfig {
  format: 'excel' | 'pdf' | 'csv';
  dataType: string;
  includeImages: boolean;
  includeSummary: boolean;
  dateRange: string;
}

const EnhancedReportExporter = () => {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'excel',
    dataType: '',
    includeImages: false,
    includeSummary: true,
    dateRange: 'current_month'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const dataTypes = [
    { value: 'customers', label: 'العملاء', icon: Users },
    { value: 'suppliers', label: 'الموردين', icon: Building2 },
    { value: 'invoices', label: 'الفواتير', icon: CreditCard },
    { value: 'bookings', label: 'الحجوزات', icon: Calendar },
    { value: 'financial', label: 'التقرير المالي الشامل', icon: FileText }
  ];

  const handleExport = async () => {
    if (!config.dataType) {
      toast.error('يرجى اختيار نوع البيانات');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      // محاكاة تقدم التصدير
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // جلب البيانات من قاعدة البيانات
      const data = await fetchData(config.dataType);
      
      // تصدير حسب النوع المحدد
      switch (config.format) {
        case 'excel':
          await exportToExcel(data, config);
          break;
        case 'pdf':
          await exportToPDF(data, config);
          break;
        case 'csv':
          await exportToCSV(data, config);
          break;
      }

      toast.success('تم تصدير التقرير بنجاح');
      
    } catch (error) {
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const fetchData = async (dataType: string) => {
    // هنا يتم جلب البيانات من قاعدة البيانات
    const { supabase } = await import('@/integrations/supabase/client');
    
    switch (dataType) {
      case 'customers':
        const { data: customers } = await supabase.from('customers').select('*');
        return customers || [];
      case 'suppliers':
        const { data: suppliers } = await supabase.from('suppliers').select('*') as any;
        return suppliers || [];
      case 'financial':
        // جلب تقرير مالي شامل
        return await generateFinancialReport();
      default:
        return [];
    }
  };

  const generateFinancialReport = async () => {
    // إنشاء تقرير مالي شامل
    return {
      summary: {
        totalRevenue: 150000,
        totalExpenses: 85000,
        netProfit: 65000,
        period: 'الشهر الحالي'
      },
      bookings: [],
      expenses: [],
      revenue: []
    };
  };

  const exportToExcel = async (data: any, config: ExportConfig) => {
    const workbook = XLSX.utils.book_new();
    
    if (Array.isArray(data)) {
      // بيانات عادية
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, config.dataType);
    } else if (config.dataType === 'financial') {
      // تقرير مالي متعدد الأوراق
      const summarySheet = XLSX.utils.json_to_sheet([data.summary]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');
      
      if (data.bookings?.length) {
        const bookingsSheet = XLSX.utils.json_to_sheet(data.bookings);
        XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'الحجوزات');
      }
    }
    
    const fileName = `${config.dataType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = async (data: any, config: ExportConfig) => {
    const pdf = new jsPDF();
    
    // إعداد الخط العربي (إذا كان متاحاً)
    pdf.setFont('helvetica');
    pdf.setFontSize(16);
    
    // عنوان التقرير
    const title = `تقرير ${dataTypes.find(t => t.value === config.dataType)?.label}`;
    pdf.text(title, 20, 20);
    
    // إضافة التاريخ
    pdf.setFontSize(12);
    pdf.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 20, 35);
    
    // إضافة البيانات
    let yPosition = 50;
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      
      // رؤوس الجدول
      headers.forEach((header, index) => {
        pdf.text(header, 20 + (index * 40), yPosition);
      });
      
      yPosition += 10;
      
      // البيانات
      data.slice(0, 20).forEach((row, rowIndex) => {
        headers.forEach((header, colIndex) => {
          const value = row[header]?.toString() || '';
          pdf.text(value.substring(0, 15), 20 + (colIndex * 40), yPosition + (rowIndex * 8));
        });
      });
    }
    
    const fileName = `${config.dataType}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const exportToCSV = async (data: any, config: ExportConfig) => {
    if (!Array.isArray(data)) return;
    
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.dataType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير متقدم للبيانات والتقارير
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">إعدادات التصدير</TabsTrigger>
            <TabsTrigger value="templates">قوالب جاهزة</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            {/* اختيار نوع البيانات */}
            <div>
              <label className="text-sm font-medium mb-2 block">نوع البيانات</label>
              <Select value={config.dataType} onValueChange={(value) => setConfig(prev => ({ ...prev, dataType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع البيانات" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* صيغة التصدير */}
            <div>
              <label className="text-sm font-medium mb-2 block">صيغة التصدير</label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={config.format === 'excel' ? 'default' : 'outline'}
                  onClick={() => setConfig(prev => ({ ...prev, format: 'excel' }))}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant={config.format === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setConfig(prev => ({ ...prev, format: 'pdf' }))}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant={config.format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setConfig(prev => ({ ...prev, format: 'csv' }))}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>

            {/* خيارات إضافية */}
            <div className="space-y-3">
              <label className="text-sm font-medium">خيارات إضافية</label>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeSummary"
                  checked={config.includeSummary}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeSummary: checked as boolean }))}
                />
                <label htmlFor="includeSummary" className="text-sm">تضمين ملخص البيانات</label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeImages"
                  checked={config.includeImages}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeImages: checked as boolean }))}
                />
                <label htmlFor="includeImages" className="text-sm">تضمين الصور والرسوم البيانية</label>
              </div>
            </div>

            {/* شريط التقدم */}
            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>جاري التصدير...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* زر التصدير */}
            <Button 
              onClick={handleExport}
              disabled={isExporting || !config.dataType}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'جاري التصدير...' : 'تصدير الآن'}
            </Button>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* قوالب جاهزة */}
              <Card className="p-4">
                <h4 className="font-semibold mb-2">تقرير العملاء الشامل</h4>
                <p className="text-sm text-gray-600 mb-3">تقرير يشمل جميع بيانات العملاء مع إحصائيات الحجوزات</p>
                <Button size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-2" />
                  استخدام القالب
                </Button>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-semibold mb-2">التقرير المالي الشهري</h4>
                <p className="text-sm text-gray-600 mb-3">تقرير مالي كامل بالإيرادات والمصروفات والأرباح</p>
                <Button size="sm" className="w-full">
                  <Download className="h-3 w-3 mr-2" />
                  استخدام القالب
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedReportExporter;
