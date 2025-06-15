
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataExporterProps {
  exchangeRates: any[];
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

const DataExporter = ({ exchangeRates, latestRates }: DataExporterProps) => {
  const [exportType, setExportType] = useState<'current' | 'historical' | 'analytics'>('current');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "لا توجد بيانات للتصدير",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data: any[] = [];
      let filename = '';

      switch (exportType) {
        case 'current':
          data = latestRates.map(({ pair, latest, trend }) => ({
            زوج_العملة: pair,
            السعر_الحالي: latest.rate,
            تاريخ_التحديث: latest.effective_date,
            الاتجاه: trend === 'up' ? 'صاعد' : trend === 'down' ? 'هابط' : 'ثابت',
            العملة_الأساسية: latest.from_currency,
            العملة_المقابلة: latest.to_currency
          }));
          filename = `current_exchange_rates_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'historical':
          data = exchangeRates.map(rate => ({
            العملة_الأساسية: rate.from_currency,
            العملة_المقابلة: rate.to_currency,
            السعر: rate.rate,
            تاريخ_التفعيل: rate.effective_date,
            تاريخ_الإنشاء: rate.created_at.split('T')[0],
            نشط: rate.is_active ? 'نعم' : 'لا'
          }));
          filename = `historical_exchange_rates_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'analytics':
          data = latestRates.map(({ pair, latest, previous, trend }) => {
            const daysSinceUpdate = Math.floor(
              (new Date().getTime() - new Date(latest.effective_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            const changePercent = previous 
              ? ((latest.rate - previous.rate) / previous.rate * 100).toFixed(2)
              : '0';

            return {
              زوج_العملة: pair,
              السعر_الحالي: latest.rate,
              السعر_السابق: previous?.rate || 'غير متوفر',
              نسبة_التغيير: `${changePercent}%`,
              الاتجاه: trend === 'up' ? 'صاعد' : trend === 'down' ? 'هابط' : 'ثابت',
              أيام_منذ_التحديث: daysSinceUpdate,
              حالة_النضارة: daysSinceUpdate <= 1 ? 'حديث' : daysSinceUpdate <= 7 ? 'قديم نسبياً' : 'قديم'
            };
          });
          filename = `exchange_rates_analytics_${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      exportToCSV(data, filename);
      
      toast({
        title: "تم تصدير البيانات بنجاح",
        description: `تم تصدير ${data.length} سجل إلى ملف CSV`,
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير البيانات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">نوع البيانات المراد تصديرها:</label>
          <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  الأسعار الحالية
                </div>
              </SelectItem>
              <SelectItem value="historical">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  البيانات التاريخية
                </div>
              </SelectItem>
              <SelectItem value="analytics">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  تقرير التحليلات
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-600">
          {exportType === 'current' && `سيتم تصدير ${latestRates.length} سعر حالي`}
          {exportType === 'historical' && `سيتم تصدير ${exchangeRates.length} سجل تاريخي`}
          {exportType === 'analytics' && `سيتم تصدير تقرير تحليلي شامل`}
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'جاري التصدير...' : 'تصدير إلى CSV'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataExporter;
