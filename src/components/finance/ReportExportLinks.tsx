import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const reports = [
  { path: '/income-statement', label: 'قائمة الدخل والمصروفات' },
  { path: '/trial-balance', label: 'ميزان المراجعة' },
  { path: '/cash-flow', label: 'التدفق النقدي' },
];

export default function ReportExportLinks() {
  const { hasPermission } = usePermissionCheck();
  const canExport = hasPermission('financial_view') && hasPermission('reports_export');

  return (
    <Card dir="rtl">
      <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />تصدير التقارير</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p>افتح التقرير، وحدد الفترة والعملة، ثم استخدم زر «تصدير CSV» لتنزيل البيانات المعروضة.</p>
        {canExport ? (
          <div className="flex flex-wrap gap-3">
            {reports.map(report => <Button key={report.path} variant="outline" asChild><Link to={report.path}>{report.label}</Link></Button>)}
          </div>
        ) : <p role="status" className="text-sm text-muted-foreground">تحتاج صلاحية عرض المالية وتصدير التقارير لاستخدام هذه المسارات.</p>}
        <p className="text-sm text-muted-foreground">تصدير PDF وExcel والإرسال بالبريد والجدولة غير متاحة من هذه الشاشة حاليًا.</p>
      </CardContent>
    </Card>
  );
}
