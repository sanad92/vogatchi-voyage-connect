import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, Download, Calendar, Users, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

type ReportType = 'bookings' | 'customers' | 'invoices' | 'suppliers' | 'employees';

const reportConfigs: Record<ReportType, { label: string; icon: any; table: string }> = {
  bookings: { label: 'الحجوزات', icon: Calendar, table: 'bookings' },
  customers: { label: 'العملاء', icon: Users, table: 'customers' },
  invoices: { label: 'الفواتير', icon: CreditCard, table: 'invoices' },
  suppliers: { label: 'الموردين', icon: Building2, table: 'suppliers' },
  employees: { label: 'الموظفين', icon: Users, table: 'employees' },
};

const ExportCenter = () => {
  const orgId = useOrgId();
  const [selectedReport, setSelectedReport] = useState<ReportType>('bookings');
  const [exporting, setExporting] = useState(false);

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings-export', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('organization_settings').select('*').eq('organization_id', orgId!).maybeSingle();
      return data;
    },
    enabled: !!orgId,
  });

  const fetchData = async (type: ReportType) => {
    const { table } = reportConfigs[type];
    const query = supabase.from(table as any).select('*');
    // Add org filter
    const { data, error } = await (query as any).eq('organization_id', orgId!).limit(1000);
    if (error) throw error;
    return data || [];
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const data = await fetchData(selectedReport);
      if (!data.length) { toast.error('لا توجد بيانات للتصدير'); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportConfigs[selectedReport].label);
      XLSX.writeFile(wb, `${reportConfigs[selectedReport].label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تصدير الملف بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const data = await fetchData(selectedReport);
      if (!data.length) { toast.error('لا توجد بيانات للتصدير'); return; }

      const doc = new jsPDF({ orientation: 'landscape' });
      const orgName = orgSettings?.business_name_ar || orgSettings?.business_name || 'التقرير';

      // Header
      doc.setFontSize(18);
      doc.text(orgName, doc.internal.pageSize.width / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`تقرير ${reportConfigs[selectedReport].label}`, doc.internal.pageSize.width / 2, 30, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`, doc.internal.pageSize.width / 2, 38, { align: 'center' });

      // Table data
      const columns = Object.keys(data[0]).filter(k => !['id', 'organization_id', 'created_by'].includes(k)).slice(0, 8);
      const startY = 48;
      const cellWidth = (doc.internal.pageSize.width - 20) / columns.length;
      const cellHeight = 8;

      // Header row
      doc.setFillColor(41, 98, 255);
      doc.rect(10, startY, doc.internal.pageSize.width - 20, cellHeight, 'F');
      doc.setTextColor(255);
      doc.setFontSize(7);
      columns.forEach((col, i) => {
        doc.text(col, 12 + i * cellWidth, startY + 5.5);
      });

      // Data rows
      doc.setTextColor(0);
      data.slice(0, 50).forEach((row, ri) => {
        const y = startY + cellHeight + ri * cellHeight;
        if (y > doc.internal.pageSize.height - 20) return;
        if (ri % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(10, y, doc.internal.pageSize.width - 20, cellHeight, 'F');
        }
        columns.forEach((col, ci) => {
          const val = String(row[col] ?? '').slice(0, 25);
          doc.text(val, 12 + ci * cellWidth, y + 5.5);
        });
      });

      // Footer
      const footerY = doc.internal.pageSize.height - 10;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${data.length} سجل`, doc.internal.pageSize.width / 2, footerY, { align: 'center' });

      doc.save(`${reportConfigs[selectedReport].label}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('تم تصدير PDF بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">مركز التصدير</h2>
        <Badge variant="secondary">تصدير احترافي</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">اختر التقرير</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(reportConfigs) as [ReportType, typeof reportConfigs[ReportType]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedReport(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-right ${
                  selectedReport === key ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <cfg.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{cfg.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">تصدير {reportConfigs[selectedReport].label}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              سيتم تصدير بيانات {reportConfigs[selectedReport].label} الخاصة بمؤسستك مع شعار وبيانات المؤسسة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-2 hover:border-emerald-500 transition-colors cursor-pointer" onClick={exportExcel}>
                <CardContent className="p-6 text-center space-y-3">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-emerald-600" />
                  <h3 className="font-semibold">تصدير Excel</h3>
                  <p className="text-xs text-muted-foreground">بيانات تفصيلية قابلة للتعديل</p>
                  <Button className="w-full" variant="outline" disabled={exporting}>
                    <Download className="h-4 w-4 ml-2" />
                    {exporting ? 'جاري التصدير...' : 'تحميل XLSX'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-red-500 transition-colors cursor-pointer" onClick={exportPDF}>
                <CardContent className="p-6 text-center space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-red-600" />
                  <h3 className="font-semibold">تصدير PDF</h3>
                  <p className="text-xs text-muted-foreground">تقرير احترافي بشعار المؤسسة</p>
                  <Button className="w-full" variant="outline" disabled={exporting}>
                    <Download className="h-4 w-4 ml-2" />
                    {exporting ? 'جاري التصدير...' : 'تحميل PDF'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportCenter;
