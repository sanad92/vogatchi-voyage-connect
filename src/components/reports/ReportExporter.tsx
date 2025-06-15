
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { 
  Download, 
  FileText, 
  Table, 
  Image,
  Mail,
  Calendar,
  CheckCircle
} from "lucide-react";

interface ExportOptions {
  format: "pdf" | "excel" | "csv" | "png";
  reportType: string;
  includeCharts: boolean;
  includeDetails: boolean;
  includeSummary: boolean;
  dateRange: string;
  emailRecipients: string;
  scheduleExport: boolean;
}

const ReportExporter = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "pdf",
    reportType: "financial",
    includeCharts: true,
    includeDetails: true,
    includeSummary: true,
    dateRange: "current_month",
    emailRecipients: "",
    scheduleExport: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const updateOption = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // محاكاة عملية التصدير
    for (let i = 0; i <= 100; i += 10) {
      setExportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsExporting(false);
    setExportProgress(0);

    toast({
      title: "تم التصدير بنجاح",
      description: `تم تصدير التقرير بصيغة ${exportOptions.format.toUpperCase()}`,
    });
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf": return <FileText className="h-4 w-4" />;
      case "excel": return <Table className="h-4 w-4" />;
      case "csv": return <Table className="h-4 w-4" />;
      case "png": return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case "pdf": return "مناسب للطباعة والعرض";
      case "excel": return "مناسب للتحليل والحسابات";
      case "csv": return "مناسب لاستيراد البيانات";
      case "png": return "مناسب للمشاركة السريعة";
      default: return "";
    }
  };

  const reportTypes = [
    { value: "financial", label: "التقرير المالي", description: "الإيرادات والأرباح والمصروفات" },
    { value: "sales", label: "تقرير المبيعات", description: "أداء المبيعات والحجوزات" },
    { value: "customers", label: "تقرير العملاء", description: "تحليل سلوك العملاء وولائهم" },
    { value: "performance", label: "تقرير الأداء", description: "مؤشرات الأداء الرئيسية" },
    { value: "comprehensive", label: "التقرير الشامل", description: "جميع البيانات والإحصائيات" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير التقارير
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* اختيار نوع التقرير */}
        <div>
          <Label>نوع التقرير</Label>
          <Select value={exportOptions.reportType} onValueChange={(value) => updateOption('reportType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع التقرير" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* اختيار صيغة التصدير */}
        <div>
          <Label>صيغة التصدير</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {["pdf", "excel", "csv", "png"].map((format) => (
              <div
                key={format}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  exportOptions.format === format
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => updateOption('format', format)}
              >
                <div className="flex items-center gap-2">
                  {getFormatIcon(format)}
                  <span className="font-medium uppercase">{format}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getFormatDescription(format)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* خيارات المحتوى */}
        <div>
          <Label>محتويات التقرير</Label>
          <div className="space-y-3 mt-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="include-summary"
                checked={exportOptions.includeSummary}
                onCheckedChange={(checked) => updateOption('includeSummary', checked)}
              />
              <label htmlFor="include-summary" className="text-sm font-medium">
                تضمين الملخص التنفيذي
              </label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="include-charts"
                checked={exportOptions.includeCharts}
                onCheckedChange={(checked) => updateOption('includeCharts', checked)}
              />
              <label htmlFor="include-charts" className="text-sm font-medium">
                تضمين الرسوم البيانية
              </label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="include-details"
                checked={exportOptions.includeDetails}
                onCheckedChange={(checked) => updateOption('includeDetails', checked)}
              />
              <label htmlFor="include-details" className="text-sm font-medium">
                تضمين البيانات التفصيلية
              </label>
            </div>
          </div>
        </div>

        {/* فترة التقرير */}
        <div>
          <Label>فترة التقرير</Label>
          <Select value={exportOptions.dateRange} onValueChange={(value) => updateOption('dateRange', value)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="yesterday">أمس</SelectItem>
              <SelectItem value="current_week">الأسبوع الحالي</SelectItem>
              <SelectItem value="last_week">الأسبوع الماضي</SelectItem>
              <SelectItem value="current_month">الشهر الحالي</SelectItem>
              <SelectItem value="last_month">الشهر الماضي</SelectItem>
              <SelectItem value="current_quarter">الربع الحالي</SelectItem>
              <SelectItem value="current_year">السنة الحالية</SelectItem>
              <SelectItem value="custom">فترة مخصصة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* إرسال بالبريد الإلكتروني */}
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-2">
            <Checkbox
              id="email-report"
              checked={!!exportOptions.emailRecipients}
              onCheckedChange={(checked) => updateOption('emailRecipients', checked ? 'example@example.com' : '')}
            />
            <label htmlFor="email-report" className="text-sm font-medium">
              إرسال التقرير بالبريد الإلكتروني
            </label>
          </div>
          {exportOptions.emailRecipients && (
            <Input
              placeholder="البريد الإلكتروني (افصل بينها بفاصلة)"
              value={exportOptions.emailRecipients}
              onChange={(e) => updateOption('emailRecipients', e.target.value)}
            />
          )}
        </div>

        {/* جدولة التصدير */}
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="schedule-export"
              checked={exportOptions.scheduleExport}
              onCheckedChange={(checked) => updateOption('scheduleExport', checked)}
            />
            <label htmlFor="schedule-export" className="text-sm font-medium">
              جدولة التصدير التلقائي
            </label>
          </div>
          {exportOptions.scheduleExport && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Calendar className="h-4 w-4" />
                سيتم إرسال هذا التقرير تلقائياً كل شهر
              </div>
            </div>
          )}
        </div>

        {/* شريط التقدم */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>جاري تصدير التقرير...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        {/* أزرار الإجراء */}
        <div className="flex gap-3">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                تصدير التقرير
              </>
            )}
          </Button>
          
          {exportOptions.emailRecipients && (
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              إرسال
            </Button>
          )}
        </div>

        {/* معلومات إضافية */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">نصائح للتصدير:</div>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>• استخدم PDF للطباعة والعرض الرسمي</li>
                <li>• استخدم Excel للتحليل والحسابات المتقدمة</li>
                <li>• استخدم CSV لاستيراد البيانات لأنظمة أخرى</li>
                <li>• استخدم PNG للمشاركة السريعة في العروض</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportExporter;
