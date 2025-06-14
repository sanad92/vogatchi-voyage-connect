
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Download, FileSpreadsheet } from "lucide-react";
import { DateRange } from "react-day-picker";

interface ReportFilters {
  dateRange?: DateRange;
  customerName?: string;
  serviceType?: string;
  status?: string;
  supplier?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface AdvancedReportsFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onExport?: (format: 'pdf' | 'excel') => void;
}

const AdvancedReportsFilters = ({ filters, onFiltersChange, onExport }: AdvancedReportsFiltersProps) => {
  const [tempFilters, setTempFilters] = useState<ReportFilters>(filters);

  const applyFilters = () => {
    onFiltersChange(tempFilters);
  };

  const clearFilters = () => {
    const emptyFilters: ReportFilters = {};
    setTempFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          فلاتر التقارير المتقدمة
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">{getActiveFiltersCount()} فلتر نشط</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* فلتر التاريخ */}
          <div className="space-y-2">
            <Label>نطاق التاريخ</Label>
            <DatePickerWithRange 
              value={tempFilters.dateRange}
              onChange={(range) => setTempFilters({ ...tempFilters, dateRange: range })}
            />
          </div>

          {/* فلتر اسم العميل */}
          <div className="space-y-2">
            <Label>اسم العميل</Label>
            <Input
              placeholder="ابحث عن عميل..."
              value={tempFilters.customerName || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, customerName: e.target.value })}
            />
          </div>

          {/* فلتر نوع الخدمة */}
          <div className="space-y-2">
            <Label>نوع الخدمة</Label>
            <Select
              value={tempFilters.serviceType || ''}
              onValueChange={(value) => setTempFilters({ ...tempFilters, serviceType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الخدمة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">فنادق</SelectItem>
                <SelectItem value="flight">طيران</SelectItem>
                <SelectItem value="package">باقات سياحية</SelectItem>
                <SelectItem value="visa">تأشيرات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* فلتر الحالة */}
          <div className="space-y-2">
            <Label>حالة الحجز</Label>
            <Select
              value={tempFilters.status || ''}
              onValueChange={(value) => setTempFilters({ ...tempFilters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* فلتر المبلغ الأدنى */}
          <div className="space-y-2">
            <Label>المبلغ الأدنى</Label>
            <Input
              type="number"
              placeholder="0"
              value={tempFilters.minAmount || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, minAmount: Number(e.target.value) })}
            />
          </div>

          {/* فلتر المبلغ الأعلى */}
          <div className="space-y-2">
            <Label>المبلغ الأعلى</Label>
            <Input
              type="number"
              placeholder="100000"
              value={tempFilters.maxAmount || ''}
              onChange={(e) => setTempFilters({ ...tempFilters, maxAmount: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
            <Filter className="h-4 w-4 mr-2" />
            تطبيق الفلاتر
          </Button>
          
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            مسح الفلاتر
          </Button>

          {onExport && (
            <>
              <Button 
                variant="outline" 
                onClick={() => onExport('pdf')}
                className="bg-red-50 hover:bg-red-100"
              >
                <Download className="h-4 w-4 mr-2" />
                تصدير PDF
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => onExport('excel')}
                className="bg-green-50 hover:bg-green-100"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                تصدير Excel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedReportsFilters;
