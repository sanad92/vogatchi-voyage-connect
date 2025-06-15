
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Search, Calendar, DollarSign, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface SmartReportFiltersProps {
  onFiltersChange: (filters: any) => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  onRefresh: () => void;
}

const SmartReportFilters = ({ onFiltersChange, onExport, onRefresh }: SmartReportFiltersProps) => {
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterType, setFilterType] = useState('basic');

  // قوالب الفلاتر المحددة مسبقاً
  const filterTemplates = [
    {
      name: 'المصروفات الشهرية',
      description: 'تقرير شامل للمصروفات للشهر الحالي',
      filters: { period: 'current_month', categories: 'all' }
    },
    {
      name: 'مقارنة ربع سنوية',
      description: 'مقارنة الأداء للربع الحالي مع السابق',
      filters: { period: 'quarterly', comparison: true }
    },
    {
      name: 'تحليل التكاليف العالية',
      description: 'المصروفات التي تزيد عن 5000 ريال',
      filters: { minAmount: 5000, sortBy: 'amount_desc' }
    }
  ];

  // إضافة فلتر جديد
  const addFilter = (filterKey: string, filterValue: any, filterLabel: string) => {
    const newFilter = { key: filterKey, value: filterValue, label: filterLabel };
    const updatedFilters = [...activeFilters.filter(f => f.key !== filterKey), newFilter];
    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // إزالة فلتر
  const removeFilter = (filterKey: string) => {
    const updatedFilters = activeFilters.filter(f => f.key !== filterKey);
    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // مسح جميع الفلاتر
  const clearAllFilters = () => {
    setActiveFilters([]);
    setDateRange(undefined);
    onFiltersChange([]);
  };

  // تطبيق قالب فلتر
  const applyTemplate = (template: any) => {
    const templateFilters = Object.entries(template.filters).map(([key, value]) => ({
      key,
      value,
      label: `${key}: ${value}`
    }));
    setActiveFilters(templateFilters);
    onFiltersChange(templateFilters);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر التقارير الذكية
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
            <Select onValueChange={(format: 'pdf' | 'excel' | 'csv') => onExport(format)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="تصدير" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filterType} onValueChange={setFilterType}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">فلاتر أساسية</TabsTrigger>
            <TabsTrigger value="advanced">فلاتر متقدمة</TabsTrigger>
            <TabsTrigger value="templates">قوالب جاهزة</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الفترة الزمنية</label>
                <DatePickerWithRange 
                  value={dateRange} 
                  onChange={(range) => {
                    setDateRange(range);
                    if (range) {
                      addFilter('dateRange', range, `${range.from?.toLocaleDateString()} - ${range.to?.toLocaleDateString()}`);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">نوع المصروفات</label>
                <Select onValueChange={(value) => addFilter('category', value, `الفئة: ${value}`)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="salaries">الرواتب</SelectItem>
                    <SelectItem value="rent">الإيجارات</SelectItem>
                    <SelectItem value="utilities">المرافق</SelectItem>
                    <SelectItem value="maintenance">الصيانة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">حالة الدفع</label>
                <Select onValueChange={(value) => addFilter('status', value, `الحالة: ${value}`)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="overdue">متأخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الحد الأدنى للمبلغ</label>
                <Input
                  type="number"
                  placeholder="0"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value) addFilter('minAmount', value, `الحد الأدنى: ${value.toLocaleString()}`);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الحد الأقصى للمبلغ</label>
                <Input
                  type="number"
                  placeholder="∞"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value) addFilter('maxAmount', value, `الحد الأقصى: ${value.toLocaleString()}`);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ترتيب حسب</label>
                <Select onValueChange={(value) => addFilter('sortBy', value, `ترتيب: ${value}`)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الترتيب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">التاريخ (الأحدث)</SelectItem>
                    <SelectItem value="date_asc">التاريخ (الأقدم)</SelectItem>
                    <SelectItem value="amount_desc">المبلغ (الأعلى)</SelectItem>
                    <SelectItem value="amount_asc">المبلغ (الأقل)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">طريقة الدفع</label>
                <Select onValueChange={(value) => addFilter('paymentMethod', value, `الدفع: ${value}`)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطرق</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">البحث في الوصف</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث في أوصاف المعاملات..."
                  className="pl-10"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) addFilter('search', value, `البحث: ${value}`);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filterTemplates.map((template, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => applyTemplate(template)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                    <Button size="sm" className="w-full">
                      تطبيق القالب
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* عرض الفلاتر النشطة */}
        {activeFilters.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">الفلاتر النشطة:</h4>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                مسح الكل
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {filter.label}
                  <button
                    onClick={() => removeFilter(filter.key)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartReportFilters;
